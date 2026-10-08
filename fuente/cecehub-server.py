#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔗 CeceHub — comparte las IAs de este ordenador (Ollama, LM Studio, llama.cpp…) con Cece AI:
en este mismo equipo, por la WiFi y por internet, desde cualquier sitio.

Solo necesita Python 3.8 o más nuevo. No hay que instalar nada (usa la biblioteca estándar).

  python3 cecehub-server.py               este equipo + la WiFi
  python3 cecehub-server.py --internet    además por internet: enseña un enlace con código para pegar en Cece AI
  python3 cecehub-server.py --check       diagnóstico (IAs, puertos, red, túnel)
  python3 cecehub-server.py --scan        busca otros CeceHub en esta WiFi
  python3 cecehub-server.py --new-token   cambia el código (los enlaces de antes dejan de valer)
  python3 cecehub-server.py --help        todas las opciones

Por dentro:
  · API compatible con OpenAI en /v1 (la misma que ya usa Cece Local): /v1/models, /v1/chat/completions…
    Cada petición va a la IA que tiene ese modelo, con streaming. Si el modelo tarda en cargar,
    CeceHub manda «latidos» para que ni Cece ni el túnel corten la espera.
  · Seguridad por zonas (se decide en cada petición):
      💻 este equipo (127.0.0.1, sin proxy)        → sin código
      📶 WiFi (IP privada, sin proxy)               → sin código (con --lan-token, también con código)
      🌍 internet (IP pública, túnel o cualquier proxy) → SIEMPRE con código (Authorization: Bearer …)
    El túnel llega a un puerto aparte (127.0.0.1:9997) donde TODO pide código: aunque el túnel no avise
    de que la petición viene de internet, nunca entra nada sin código.
    Sin código, además, se rechazan páginas web de internet (cabecera Origin) y nombres de dominio que no
    son de tu red (cabecera Host): una web cualquiera no puede usar tus IAs, ni con «DNS rebinding».
  · En la WiFi se anuncia como cecehub.local (mDNS) y con un aviso UDP en el puerto 9998.
  · Por internet: túnel https gratuito (cloudflared; si no, ngrok o ssh a localhost.run) que se reinicia solo.
"""
from __future__ import annotations

import argparse
import hmac
import html
import http.client
import ipaddress
import json
import logging
import os
import platform
import queue
import re
import secrets
import select
import shutil
import signal
import socket
import socketserver
import ssl
import struct
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
import urllib.parse
import urllib.request
from collections import OrderedDict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VERSION = '2.1.1'
PUERTO = 9999                 # API para Cece AI (este equipo + WiFi)
PUERTO_INTERNET = 9997        # solo 127.0.0.1: aquí llega el túnel y todo pide código
PUERTO_AVISO = 9998           # UDP: aviso «aquí hay un CeceHub» y respuesta a búsquedas
MDNS = ('224.0.0.251', 5353)
NOMBRES_MDNS_BASE = 'cecehub'
MAX_CUERPO = 64 * 1024 * 1024         # imágenes en base64 incluidas
ESPERA_ANTES_DE_LATIR = 20            # s sin cabeceras de la IA (modelo cargando) → se responde ya y se late
LATIDO = 15                           # s entre latidos SSE mientras la IA calla
CONECTAR_IA = 10                      # s para conectar con la IA local
SILENCIO_IA = 600                     # s máximos sin recibir nada de la IA
TTL_MODELOS = 5                       # s de caché de la lista de modelos
CAIDA_IA = 15                         # s que se recuerda una IA que no contesta antes de volver a probarla
FALLOS_CODIGO = (10, 300)             # 10 códigos malos en 5 min → 429 un rato
MAX_CLAVES_LIMITADOR = 5000           # IPs que recuerda el limitador (se olvidan las más antiguas)
HOSTS_LOCALES = ('localhost', '127.0.0.1', '::1')   # únicos nombres con los que se enseña el código (portada)
AQUI = os.path.dirname(os.path.abspath(__file__))
WINDOWS = os.name == 'nt'

IAS_DE_FABRICA = [
    {'name': 'Ollama', 'url': 'http://127.0.0.1:11434/v1', 'env': 'OLLAMA_URL'},
    {'name': 'LM Studio', 'url': 'http://127.0.0.1:1234/v1', 'env': 'LM_STUDIO_URL'},
    {'name': 'llama.cpp', 'url': 'http://127.0.0.1:8080/v1', 'env': 'LLAMACPP_URL'},
]
# Cabeceras que pone un proxy o un túnel: si aparece alguna, la petición viene «de fuera» (zona internet)
CABECERAS_PROXY = ('forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-real-ip',
                   'cf-connecting-ip', 'cf-ray', 'true-client-ip', 'fly-client-ip', 'x-client-ip',
                   'x-cluster-client-ip', 'tailscale-user-login', 'x-envoy-external-address', 'via')
# Modelos que no son de chat (no se ofrecen en la lista para Cece, pero se pueden usar si se piden por nombre)
NO_CHAT = re.compile(r'embed|minilm|rerank|\bbge\b', re.I)
SALTO = ('connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers',
         'transfer-encoding', 'upgrade', 'content-length', 'content-encoding')

RE_TOKEN = re.compile(r'[A-Za-z0-9_\-]{24,128}')
# Redes de casa (zona WiFi, sin código). No vale ipaddress.is_private: da por «privadas» 6to4 (2002::/16), Teredo
# (2001::/32), las IPv6 de Tailscale y redes de documentación, y por ahí podría entrar alguien de internet sin código.
REDES_LAN = [ipaddress.ip_network(n) for n in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16', 'fe80::/10', 'fc00::/7')]
NO_LAN = [ipaddress.ip_network(n) for n in ('fd7a:115c:a1e0::/48',)]   # Tailscale IPv6: llega de cualquier sitio → con código
REDES_PREFERIDAS = [ipaddress.ip_network(n) for n in ('192.168.0.0/16', '172.16.0.0/12', '10.0.0.0/8')]
RE_NONCE = re.compile(r'[A-Za-z0-9_\-]{16,128}')
RE_LONGITUD = re.compile(r'[0-9]{1,15}')
RE_TROZO = re.compile(rb'[0-9A-Fa-f]{1,15}')
RE_RUTA_MALA = re.compile('[\x00-\x20\x7f-\U0010ffff]')    # control, espacios o no ASCII en la ruta (sin codificar con %)
TAILSCALE = ipaddress.ip_network('100.64.0.0/10')

log = logging.getLogger('cecehub')


# =====================================================================================
#  Utilidades
# =====================================================================================
def consola_utf8():
    """En Windows la consola puede no ser UTF-8: sin esto, un emoji tumba el servidor."""
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass


RE_CONTROL = re.compile('[\x00-\x1f\x7f-\x9f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ud800-\udfff]')


def limpio(texto, n=None):
    """Texto que viene de fuera, listo para la consola: sin secuencias ESC ni caracteres de control (se ven como \\x1b)"""
    t = RE_CONTROL.sub(lambda m: '\\x%02x' % ord(m.group()) if ord(m.group()) < 256 else '\\u%04x' % ord(m.group()), str(texto))
    return t[:n] if n else t


def ip_de(texto):
    """'::ffff:192.168.1.5' → IPv4Address('192.168.1.5'); 'fe80::1%en0' → IPv6Address('fe80::1'); basura → None"""
    try:
        ip = ipaddress.ip_address(str(texto).split('%', 1)[0])
    except ValueError:
        return None
    if ip.version == 6 and ip.ipv4_mapped:
        return ip.ipv4_mapped
    return ip


def ip_estricta(texto):
    """IP que viene en una cabecera (X-Forwarded-For…), normalizada: '1.2.3.4', '[2001:db8::1]:443' → '2001:db8::1'.
    Sin zonas («%eth0»), sin espacios raros ni basura: si no es una IP limpia → None."""
    t = str(texto or '').strip()
    if not t or '%' in t or len(t) > 64:
        return None
    m = re.fullmatch(r'\[([0-9A-Fa-f:.]+)\](?::[0-9]{1,5})?', t) or re.fullmatch(r'([0-9.]+):[0-9]{1,5}', t)
    if m:
        t = m.group(1)
    try:
        ip = ipaddress.ip_address(t)
    except ValueError:
        return None
    if ip.version == 6 and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return str(ip)


def prioridad_ip(ip):
    """Orden para enseñar las IPs de la WiFi: 192.168.x primero, luego 172.16/12 y luego 10/8 (las 10.x suelen ser de VPN)"""
    x = ip_de(ip)
    if x is None or not es_ip_lan(x):
        return 9
    for i, red in enumerate(REDES_PREFERIDAS):
        if x.version == 4 and x in red:
            return i
    return 3


def ips_locales():
    """IPv4 de este equipo en sus redes (sin 127.x). Funciona también sin internet (WiFi sin salida, punto de acceso…):
    pregunta a la tabla de rutas por qué interfaz saldría hacia varias direcciones (UDP no envía nada al conectar)."""
    ips = []
    for destino in ('8.8.8.8', '10.255.255.254', '172.31.255.254', '192.168.255.254', '172.20.10.14', '192.168.137.254'):
        ip = ip_hacia(destino)
        if ip and not ip.startswith('127.') and ip != '0.0.0.0' and ip not in ips:
            ips.append(ip)
    return sorted(ips, key=prioridad_ip)   # (sort estable: dentro de cada tipo, la de la ruta por defecto primero)


def ip_hacia(destino):
    """IP de este equipo por la que se llega a «destino» (la de la interfaz de esa red), o None"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect((destino, 9))
        return s.getsockname()[0]
    except (OSError, OverflowError, TypeError, ValueError):
        return None
    finally:
        s.close()


def ip_del_tunel(cabeceras, proveedor):
    """IP de quien llama por internet, según el túnel que la trae (cada uno pone una cabecera concreta; las demás las
    puede inventar quien llama): cloudflared → Cf-Connecting-Ip (Cloudflare la sobrescribe siempre); ngrok, ssh y
    --public-url → el ÚLTIMO valor de X-Forwarded-For (el que añadió el proxy); desconocido → Cf-Connecting-Ip si viene
    y, si no, el último de X-Forwarded-For. Sin una IP válida → None."""
    cf = cabeceras.get('cf-connecting-ip')
    xff = ','.join(cabeceras.get_all('x-forwarded-for') or [])
    ultimo = xff.split(',')[-1] if xff.strip() else None
    if proveedor == 'cloudflared':
        return ip_estricta(cf)
    if proveedor in ('ngrok', 'ssh', 'manual'):
        return ip_estricta(ultimo)
    return ip_estricta(cf) if cf else ip_estricta(ultimo)


def clave_limite(cliente):
    """Clave del limitador de códigos malos: la IPv4, o la /64 de una IPv6 (cada casa u operador da una /64 entera:
    contar por dirección sería no limitar). '?' (sin IP fiable) → todos los que no la traen comparten cupo."""
    ip = ip_de(cliente)
    if ip is None:
        return 'internet:' + str(cliente)
    if ip.version == 6:
        return 'internet:' + str(ipaddress.ip_network((int(ip) >> 64 << 64, 64)))
    return 'internet:' + str(ip)


def origen_udp_valido(ip):
    """El aviso UDP y mDNS solo contestan a este equipo y a las redes de casa: si no, servirían de «reflector» por internet"""
    x = ip_de(ip)
    return x is not None and (x.is_loopback or es_ip_lan(x))


def es_ip_lan(ip):
    """¿Es una dirección de una red de casa? (acepta texto o ip_address; '::ffff:192.168.1.5' cuenta como la IPv4)"""
    ip = ip_de(ip) if not isinstance(ip, (ipaddress.IPv4Address, ipaddress.IPv6Address)) else ip
    if ip is None:
        return False
    if ip.version == 6 and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return any(ip in n for n in REDES_LAN if n.version == ip.version) and not any(ip in n for n in NO_LAN if n.version == ip.version)


def ip_tailscale():
    """[IP de Tailscale] si este equipo está en una tailnet (por dónde saldría hacia 100.100.100.100, su DNS), o []"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('100.100.100.100', 9))
        ip = s.getsockname()[0]
    except OSError:
        return []
    finally:
        s.close()
    try:
        return [ip] if ipaddress.ip_address(ip) in TAILSCALE else []
    except ValueError:
        return []


def ip6_global():
    """IPv6 global de este equipo (para reconocer como WiFi a los equipos de la misma /64), o None"""
    try:
        s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)   # sin IPv6 en el sistema, esto ya falla
    except (OSError, AttributeError):
        return None
    try:
        s.connect(('2001:4860:4860::8888', 9))
        ip = ip_de(s.getsockname()[0])
        return ip if ip and ip.version == 6 and ip.is_global else None
    except OSError:
        return None
    finally:
        s.close()


def nombre_equipo():
    n = re.sub(r'\.local$', '', socket.gethostname() or 'CeceHub', flags=re.I)
    return n[:40] or 'CeceHub'


def host_sin_puerto(host):
    host = (host or '').strip().lower()
    if host.startswith('['):
        return host[1:host.find(']')] if ']' in host else host[1:]
    if host.count(':') == 1:
        return host.split(':', 1)[0]
    return host


def es_host_de_red(host, extra=()):
    """¿El nombre (cabecera Host u Origin) es de esta red? Las páginas de internet que intentan «DNS rebinding»
    usan un dominio suyo que apunta a tu IP: ese dominio no está en esta lista."""
    h = host_sin_puerto(host).rstrip('.')
    if not h:
        return True
    if ip_de(h) is not None:
        return True
    if h == 'localhost' or h.endswith('.localhost'):
        return True
    if re.search(r'\.(local|lan|home|internal|home\.arpa)$', h):   # nombres que no se pueden registrar en internet
        return True
    eq = nombre_equipo().lower()
    if h in (eq, eq + '.local'):
        return True
    return h in {x.lower() for x in extra}


def es_host_local(host):
    """¿Host (sin puerto) es exactamente localhost, 127.0.0.1 o ::1? Solo así se enseña el código: un nombre de la red
    (trampa.local, evil.lan…) lo puede apuntar a 127.0.0.1 una web con «DNS rebinding» y leerlo."""
    return host_sin_puerto(host) in HOSTS_LOCALES


def ruta_con_saltos(ruta):
    """¿Trae segmentos «.» o «..» (también escritos %2e, %252e…) o «\\»? Reenviada tal cual, /v1/../api/pull saldría de
    la API /v1 de la IA (Ollama: descargar, crear o copiar modelos), que es lo único que CeceHub deja usar."""
    r = ruta
    for _ in range(3):
        u = urllib.parse.unquote(r)
        if u == r:
            break
        r = u
    return '\\' in r or any(p in ('.', '..') for p in r.split('/'))


def partir_url(u):
    """urlsplit que no lanza: 'http://[::1' → None"""
    try:
        return urllib.parse.urlsplit(u)
    except ValueError:
        return None


def origen_de_red(origin):
    """Origin de una página que puede usar CeceHub sin código: archivo local (null), localhost o una IP/nombre de la red."""
    if origin is None or origin == '':
        return True            # no es un navegador (curl, Python…) o es una petición de la misma página
    if origin == 'null':
        return True            # Cece AI abierto como archivo (file://)
    p = partir_url(origin)
    if p is None or p.scheme not in ('http', 'https') or not p.hostname:
        return False           # (Origin mal formado = no es de red)
    ip = ip_de(p.hostname)
    if ip is not None:
        return ip.is_loopback or es_ip_lan(ip)
    return p.hostname == 'localhost' or p.hostname.endswith('.localhost') or p.hostname.endswith('.local')


def motivo_red(e):
    if isinstance(e, ConnectionRefusedError):
        return 'apagado'
    if isinstance(e, (socket.timeout, TimeoutError)):
        return 'no responde'
    if isinstance(e, socket.gaierror):
        return 'nombre desconocido'
    return (type(e).__name__ + (': ' + str(e) if str(e) else ''))[:120]


def mensaje_de_error(datos, max_len=300):
    """Texto del error que devolvió una IA (JSON de OpenAI, de Ollama o texto)"""
    txt = datos.decode('utf-8', 'replace') if isinstance(datos, (bytes, bytearray)) else str(datos or '')
    try:
        j = json.loads(txt)
        e = j.get('error') if isinstance(j, dict) else None
        if isinstance(e, dict):
            return str(e.get('message') or e)[:max_len]
        if e:
            return str(e)[:max_len]
        if isinstance(j, dict) and j.get('message'):
            return str(j['message'])[:max_len]
    except (ValueError, RecursionError):
        pass
    return txt.strip()[:max_len] or 'sin detalle'


def error_openai(mensaje, tipo='invalid_request_error', codigo=None):
    return {'error': {'message': mensaje, 'type': tipo, 'code': codigo}}


def cuerpo_es_json(ctype, cuerpo):
    """¿Se lee el cuerpo como JSON (y se enruta por «model»)? Sí si no dice tipo o dice …json; también el JSON que manda
    «curl -d» sin -H (x-www-form-urlencoded) o un fetch sin cabeceras (text/plain). Lo demás (el multipart de
    /v1/audio/transcriptions, binarios…) se reenvía tal cual."""
    tipo = (ctype or '').split(';', 1)[0].strip().lower()
    if not tipo or 'json' in tipo:
        return True
    if tipo in ('application/x-www-form-urlencoded', 'text/plain'):
        return cuerpo.lstrip()[:1] == b'{'
    return False


def a_json(obj):
    """bytes UTF-8 del JSON; si trae «surrogates» sueltos (\\ud800, que no existen en UTF-8), escapados como en el original"""
    try:
        return json.dumps(obj, ensure_ascii=False).encode('utf-8')
    except UnicodeEncodeError:
        return json.dumps(obj).encode('ascii')


# =====================================================================================
#  Configuración (cecehub.json junto al programa; si esa carpeta no se puede escribir, en ~/.cecehub)
# =====================================================================================
def ruta_config(explicita=None):
    if explicita:
        return os.path.abspath(explicita)
    if os.environ.get('CECEHUB_CONFIG'):
        return os.path.abspath(os.environ['CECEHUB_CONFIG'])
    junto = os.path.join(AQUI, 'cecehub.json')
    if os.path.exists(junto) or os.access(AQUI, os.W_OK):
        return junto
    return os.path.join(os.path.expanduser('~'), '.cecehub', 'cecehub.json')


def normalizar_url_ia(u):
    """'localhost:11434' → 'http://localhost:11434/v1'; 'http://x:1234/v1/' → 'http://x:1234/v1'"""
    u = (u or '').strip()
    if not u:
        raise ValueError('dirección vacía')
    if not re.match(r'^https?://', u, re.I):
        u = 'http://' + u
    p = urllib.parse.urlsplit(u)
    if not p.hostname:
        raise ValueError(f'dirección no válida: {u}')
    ruta = p.path.rstrip('/') or '/v1'
    return urllib.parse.urlunsplit((p.scheme.lower(), p.netloc, ruta, '', ''))


def normalizar_url_publica(u):
    u = (u or '').strip().rstrip('/')
    if not u:
        return ''
    if not re.match(r'^https?://[^\s/]+', u, re.I):
        raise ValueError('la dirección pública tiene que empezar por https:// (o http://)')
    return re.sub(r'/v1$', '', u)


class ErrorConfig(OSError):
    """No se puede leer o guardar cecehub.json (permisos, carpeta de solo lectura…): se explica y se sale sin traza"""


class Config:
    def __init__(self, ruta):
        self.ruta = ruta
        self.datos = {}
        if os.path.exists(ruta):
            try:
                with open(ruta, 'rb') as f:
                    crudo = f.read()
            except OSError as e:
                # sin permiso para leerlo NO es un archivo dañado: si se rehiciera, cambiaría el código y los enlaces
                raise ErrorConfig(f'No puedo leer {ruta} ({e.strerror or e}). Revisa sus permisos '
                                  f'(¿lo creó otro usuario o «sudo»?) o usa --config con otro archivo.') from None
            try:
                d = json.loads(crudo.decode('utf-8-sig'))   # (con BOM: el Bloc de notas antiguo y PowerShell 5 lo ponen)
                if not isinstance(d, dict):
                    raise ValueError('no es un objeto JSON')
                self.datos = d
            except (ValueError, RecursionError) as e:
                copia = ruta + '.dañado-' + time.strftime('%Y%m%d-%H%M%S')
                try:
                    os.replace(ruta, copia)
                except OSError:
                    pass
                log.warning('⚠️  %s no se podía leer (%s): empiezo con uno nuevo (el viejo queda en %s).', ruta, limpio(e, 200), copia)
            else:
                self._endurecer(ruta)   # uno de una versión vieja (o copiado a mano) puede ser legible por todos
        cambiado = False
        if not re.fullmatch(r'[0-9a-f]{8}', str(self.datos.get('id', ''))):
            self.datos['id'] = secrets.token_hex(4)
            cambiado = True
        if not RE_TOKEN.fullmatch(str(self.datos.get('token', ''))):
            self.datos['token'] = secrets.token_urlsafe(24)
            cambiado = True
        if cambiado:
            self.guardar()

    def get(self, k, defecto=None):
        return self.datos.get(k, defecto)

    @staticmethod
    def _endurecer(ruta):
        """Permisos 600: el código da acceso a tus IAs, solo lo lee tu usuario (en Windows no aplica: se ignora)"""
        if os.name == 'nt':
            return
        try:
            if os.stat(ruta).st_mode & 0o077:
                os.chmod(ruta, 0o600)
        except OSError:
            pass

    def guardar(self):
        datos = json.dumps(self.datos, ensure_ascii=False, indent=2).encode('utf-8', 'replace')
        tmp = self.ruta + '.tmp'
        try:
            os.makedirs(os.path.dirname(self.ruta), exist_ok=True)
            # se crea ya con 600 (no hay ni un momento en que otro usuario pueda leer el código)
            fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | getattr(os, 'O_BINARY', 0), 0o600)
            with os.fdopen(fd, 'wb') as f:
                if os.name != 'nt' and hasattr(os, 'fchmod'):
                    os.fchmod(f.fileno(), 0o600)   # por si quedó un .tmp viejo con otros permisos (O_CREAT no los cambia)
                f.write(datos)
            os.replace(tmp, self.ruta)
        except OSError as e:
            try:
                os.remove(tmp)
            except OSError:
                pass
            raise ErrorConfig(f'No puedo guardar la configuración en {self.ruta} ({e.strerror or e}). '
                              f'Revisa los permisos de esa carpeta o usa --config con otra ruta.') from None

    def nuevo_token(self):
        self.datos['token'] = secrets.token_urlsafe(24)
        self.guardar()
        return self.datos['token']


# =====================================================================================
#  IAs locales (backends) y a cuál va cada modelo
# =====================================================================================
class IA:
    def __init__(self, nombre, url, clave=''):
        self.nombre = nombre
        self.url = normalizar_url_ia(url)
        p = urllib.parse.urlsplit(self.url)
        self.https = p.scheme == 'https'
        self.host = p.hostname
        self.puerto = p.port or (443 if self.https else 80)
        self.ruta = p.path.rstrip('/')
        self.clave = clave or ''

    def conexion(self):
        if self.https:
            c = http.client.HTTPSConnection(self.host, self.puerto, timeout=CONECTAR_IA, context=ssl.create_default_context())
        else:
            c = http.client.HTTPConnection(self.host, self.puerto, timeout=CONECTAR_IA)
        c.connect()
        c.sock.settimeout(SILENCIO_IA)
        return c

    def cabeceras(self, extra=None):
        h = {'Accept-Encoding': 'identity', 'User-Agent': 'CeceHub/' + VERSION}
        if self.clave:
            h['Authorization'] = 'Bearer ' + self.clave
        h.update(extra or {})
        return h

    def pedir_json(self, ruta, timeout=2.5):
        c = (http.client.HTTPSConnection(self.host, self.puerto, timeout=timeout, context=ssl.create_default_context())
             if self.https else http.client.HTTPConnection(self.host, self.puerto, timeout=timeout))
        try:
            c.request('GET', ruta, headers=self.cabeceras({'Accept': 'application/json'}))
            r = c.getresponse()
            datos = r.read(8 * 1024 * 1024)
            try:
                return r.status, json.loads(datos.decode('utf-8'))
            except (ValueError, RecursionError):
                return r.status, None
        finally:
            c.close()

    def listar(self):
        """(encendida, [modelos], motivo)"""
        try:
            st, j = self.pedir_json(self.ruta + '/models')
            if st == 200 and isinstance(j, dict) and isinstance(j.get('data'), list):
                return True, [m['id'] for m in j['data'] if isinstance(m, dict) and isinstance(m.get('id'), str) and m['id']], ''
            # Ollama antiguo (sin /v1/models): /api/tags
            raiz = self.ruta[:-3] if self.ruta.endswith('/v1') else self.ruta
            st2, j2 = self.pedir_json(raiz + '/api/tags')
            if st2 == 200 and isinstance(j2, dict) and isinstance(j2.get('models'), list):
                return True, [m.get('name') or m.get('model') for m in j2['models']
                              if isinstance(m, dict) and isinstance(m.get('name') or m.get('model'), str)], ''
            return False, [], f'responde {st}, pero no parece una IA'
        except (OSError, http.client.HTTPException, ValueError) as e:
            return False, [], motivo_red(e)


class Enrutador:
    """Qué modelos hay y en qué IA. La lista se consulta en segundo plano (una consulta a la vez) y, mientras tanto,
    se sirve la de antes: una IA colgada no frena las peticiones. Solo se espera si todavía no hay ninguna lista."""
    def __init__(self, ias):
        self.ias = ias
        self._lock = threading.Lock()
        self._mapa = {}          # modelo → IA
        self._estado = []        # [{name, url, ok, models, error}]
        self._cuando = 0.0       # cuándo terminó la última consulta
        self._listo = threading.Event()    # ya hay una lista
        self._hecho = None       # Event de la consulta en curso
        self._hilo = None
        self._caidas = {}        # id(IA) → (hasta cuándo no se vuelve a probar, motivo)
        self.activo = None

    def refrescar(self, forzar=False, ttl=None, esperar=False):
        """Si la lista ha caducado (o forzar), lanza una consulta en segundo plano (si no hay ya una).
        Espera a que termine solo si no hay lista todavía o si se pide (esperar)."""
        ttl = TTL_MODELOS if ttl is None else ttl
        if not forzar and not esperar and time.time() - self._cuando < ttl:
            return
        with self._lock:
            if self._hilo is not None and self._hilo.is_alive():
                hecho = self._hecho
            elif forzar or time.time() - self._cuando >= ttl or not self._listo.is_set():
                hecho = self._hecho = threading.Event()
                self._hilo = threading.Thread(target=self._consultar, args=(hecho,), daemon=True, name='modelos')
                self._hilo.start()
            else:
                return
        if esperar or not self._listo.is_set():
            hecho.wait(10)

    def _consultar(self, hecho):
        try:
            ahora = time.time()
            res = [None] * len(self.ias)
            lentas = set()     # las que tardaron en fallar (colgadas, sin respuesta): esas se dejan un rato sin probar

            def una(i, ia):
                t0 = time.time()
                try:
                    res[i] = ia.listar()
                except Exception as e:  # noqa: BLE001
                    res[i] = (False, [], motivo_red(e))
                if time.time() - t0 >= 1.0:
                    lentas.add(i)
            hilos = []
            for i, ia in enumerate(self.ias):
                caida = self._caidas.get(id(ia))
                if caida and caida[0] > ahora:
                    res[i] = (False, [], caida[1])   # no contestó hace nada: no se le vuelve a esperar todavía
                    continue
                h = threading.Thread(target=una, args=(i, ia), daemon=True, name='modelos-ia')
                h.start()
                hilos.append((i, h))
            fin = time.time() + 6
            for i, h in hilos:
                h.join(max(0.0, fin - time.time()))
                if h.is_alive():
                    lentas.add(i)
            mapa, estado = {}, []
            for i, (ia, r) in enumerate(zip(self.ias, res)):
                ok, modelos, motivo = r or (False, [], 'no responde')
                if ok:
                    self._caidas.pop(id(ia), None)
                elif i in lentas:
                    self._caidas[id(ia)] = (time.time() + CAIDA_IA, motivo)
                for m in modelos:
                    mapa.setdefault(m, ia)
                estado.append({'name': ia.nombre, 'url': ia.url, 'ok': ok, 'models': len(modelos), 'error': motivo})
            with self._lock:
                self._mapa, self._estado, self._cuando = mapa, estado, time.time()
                if self.activo not in mapa:
                    self.activo = next((m for m in mapa if not NO_CHAT.search(m)), None)
            self._listo.set()
        finally:
            hecho.set()

    def modelos(self, todos=False):
        self.refrescar()
        return [(m, ia) for m, ia in sorted(self._mapa.items()) if todos or not NO_CHAT.search(m)]

    def estado(self):
        self.refrescar()
        return list(self._estado)

    def encendidas(self):
        self.refrescar()
        return [ia for ia, e in zip(self.ias, self._estado) if e['ok']]

    def ia_para(self, modelo):
        """IA que tiene el modelo; si no la encuentra, se consulta otra vez y se espera (alguien acaba de descargar uno) y,
        si solo hay una IA encendida, va a esa (algunas cargan modelos bajo demanda)."""
        self.refrescar()
        ia = self._mapa.get(modelo)
        if ia is None and time.time() - self._cuando > 1:
            self.refrescar(forzar=True, esperar=True)
            ia = self._mapa.get(modelo)
        if ia is None:
            enc = self.encendidas()
            if len(enc) == 1:
                return enc[0]
        return ia


class Limitador:
    """Frena a quien prueba códigos: FALLOS_CODIGO[0] fallos en FALLOS_CODIGO[1] s → bloqueado ese rato"""
    def __init__(self, maximo=FALLOS_CODIGO[0], ventana=FALLOS_CODIGO[1], claves=MAX_CLAVES_LIMITADOR):
        self.maximo, self.ventana, self.claves = maximo, ventana, claves
        self._f = OrderedDict()   # clave → fallos; la de fallo más reciente, al final
        self._lock = threading.Lock()

    def _limpiar(self, k, ahora):
        d = self._f.get(k)
        while d and ahora - d[0] > self.ventana:
            d.popleft()
        if d is not None and not d:
            del self._f[k]
        return self._f.get(k)

    def bloqueado(self, k):
        with self._lock:
            d = self._limpiar(k, time.time())
            return bool(d) and len(d) >= self.maximo

    def fallo(self, k):
        with self._lock:
            ahora = time.time()
            self._limpiar(k, ahora)
            self._f.setdefault(k, deque(maxlen=self.maximo * 2)).append(ahora)
            self._f.move_to_end(k)
            while len(self._f) > self.claves:   # que nadie llene la memoria: se olvidan las más antiguas (no todas)
                self._f.popitem(last=False)


# =====================================================================================
#  Servidor HTTP
# =====================================================================================
class ServidorHub(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = os.name != 'nt'   # en Windows SO_REUSEADDR deja que dos programas usen el mismo puerto
    request_queue_size = 64

    def __init__(self, direccion, hub, solo_internet=False, familia=socket.AF_INET):
        self.address_family = familia
        self.hub = hub
        self.solo_internet = solo_internet
        super().__init__(direccion, Peticion)

    def server_bind(self):
        if self.address_family == socket.AF_INET6:
            try:
                self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)   # IPv4 e IPv6 a la vez
            except (OSError, AttributeError):
                pass
        if os.name == 'nt' and hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            try:
                self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            except OSError:
                pass
        # sin HTTPServer.server_bind: hace socket.getfqdn(), que sin red puede tardar segundos
        socketserver.TCPServer.server_bind(self)
        self.server_name, self.server_port = 'cecehub', self.server_address[1]

    def handle_error(self, request, client_address):
        e = sys.exc_info()[1]
        if isinstance(e, (ConnectionError, socket.timeout, TimeoutError)):
            return
        log.exception('Error atendiendo a %s', client_address[0] if client_address else '?')


ZONA_ICONO = {'local': '💻', 'lan': '📶', 'internet': '🌍'}


class Peticion(BaseHTTPRequestHandler):
    server_version = 'CeceHub/' + VERSION
    sys_version = ''
    protocol_version = 'HTTP/1.1'
    timeout = 120

    # ---------- registro ----------
    def log_message(self, fmt, *args):
        try:
            log.debug('%s %s', limpio(self.client_address[0]), limpio(fmt % args, 300))
        except Exception:  # noqa: BLE001 — el registro nunca tumba una petición
            pass

    def send_response(self, code, message=None):
        self._codigo = code
        super().send_response(code, message)

    @property
    def hub(self):
        return self.server.hub

    def _cliente(self):
        """IP para registrar y frenar. La que dice el túnel solo si la petición llega de un túnel de este equipo
        (cloudflared, ngrok, ssh conectan desde 127.0.0.1); si llega directa, esas cabeceras las pone quien quiere.
        Y de cada túnel, solo la cabecera que pone él (las demás las puede inventar quien llama)."""
        par = ip_de(self.client_address[0])
        if self._zona == 'internet' and par is not None and par.is_loopback:
            return ip_del_tunel(self.headers, self.hub.proveedor_actual()) or '?'   # sin IP fiable: todos comparten cupo
        return str(par) if par is not None else '?'

    # ---------- respuestas ----------
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')

    def _cerrar_si_queda_cuerpo(self):
        if getattr(self, '_cuerpo_pendiente', False):
            self.close_connection = True
            self.send_header('Connection', 'close')

    def _json(self, codigo, obj, cors=True, extra=None):
        # 'replace': un modelo pedido con «\ud800» (surrogate suelto) no puede tumbar la respuesta de error
        datos = json.dumps(obj, ensure_ascii=False).encode('utf-8', 'replace')
        self.send_response(codigo)
        if cors:
            self._cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(datos)))
        self.send_header('Cache-Control', 'no-store')
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self._cerrar_si_queda_cuerpo()
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(datos)

    def _error(self, codigo, mensaje, tipo='invalid_request_error', cod=None, extra=None):
        self._json(codigo, error_openai(mensaje, tipo, cod), extra=extra)

    def send_error(self, code, message=None, explain=None):
        """Errores del propio http.server (petición mal formada…) también en JSON y con CORS"""
        try:
            self.close_connection = True
            code = int(code)
            datos = json.dumps(error_openai(message or 'error', 'invalid_request_error', code)).encode()
            self.send_response(code, message)
            self._cors()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(datos)))
            self.send_header('Connection', 'close')
            self.end_headers()
            if getattr(self, 'command', None) != 'HEAD' and code >= 200 and code not in (204, 304):
                self.wfile.write(datos)
        except OSError:
            pass

    # ---------- entrada ----------
    def do_OPTIONS(self):
        self._atender('OPTIONS')

    def do_GET(self):
        self._atender('GET')

    def do_HEAD(self):
        self._atender('HEAD')

    def do_POST(self):
        self._atender('POST')

    def do_PUT(self):
        self._atender('PUT')

    def do_DELETE(self):
        self._atender('DELETE')

    def do_PATCH(self):
        self._atender('PATCH')

    def _atender(self, metodo):
        t0 = time.time()
        self._codigo = 0
        self._detalle = ''
        self._zona = 'internet'          # (si algo fallara antes de saberlo: lo más estricto)
        self._cuerpo_pendiente = True    # (y, si no se sabe, se cierra la conexión al acabar)
        self._query = ''
        self._por_trozos = True
        ruta = str(self.path)
        try:
            self._zona = self.hub.zona(self)
            te = (self.headers.get('Transfer-Encoding') or '').lower()
            cl = self.headers.get('Content-Length')
            self._cuerpo_pendiente = 'chunked' in te or (cl is not None and (not RE_LONGITUD.fullmatch(cl.strip()) or int(cl) > 0))
            partes = None if RE_RUTA_MALA.search(ruta) else partir_url(ruta)   # 'http://[::1/', control, no ASCII…
            if partes is None:
                return self._error(400, 'Ruta no válida.', cod='invalid_path')
            self._query = partes.query
            ruta = partes.path or '/'
            self._rutas(metodo, ruta)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, socket.timeout, TimeoutError):
            self.close_connection = True
            self._detalle = (self._detalle + ' · el cliente se fue').strip(' ·')
        except Exception as e:  # noqa: BLE001 — una petición rara nunca deja una traza ni una conexión sin respuesta
            self.close_connection = True
            self._detalle = (self._detalle + f' · error interno: {type(e).__name__}: {e}').strip(' ·')
            log.debug('Traza del error interno:', exc_info=True)
            if not self._codigo:
                try:
                    self._error(500, 'Error interno de CeceHub.', 'server_error', 'internal_error')
                except Exception:  # noqa: BLE001
                    pass
        finally:
            if self._cuerpo_pendiente:
                self.close_connection = True
            try:
                ms = (time.time() - t0) * 1000
                nivel = logging.DEBUG if ruta in ('/health', '/v1/health') or metodo == 'OPTIONS' else logging.INFO
                log.log(nivel, '%s %-15s %s %s → %s%s (%s)', ZONA_ICONO.get(self._zona, '?'), limpio(self._cliente(), 64), metodo,
                        limpio(ruta, 80), self._codigo or '—', (' ' + limpio(self._detalle, 300)) if self._detalle else '',
                        f'{ms:.0f} ms' if ms < 2000 else f'{ms / 1000:.1f} s')
            except Exception:  # noqa: BLE001
                pass

    def _rutas(self, metodo, ruta):
        if not ruta.startswith('/'):
            return self._error(400, 'Ruta no válida.')
        if metodo == 'OPTIONS':
            return self._preflight()
        if ruta in ('/health', '/v1/health'):
            return self._salud() if metodo in ('GET', 'HEAD') else self._error(405, 'Usa GET.')
        if ruta in ('/', '/index.html'):
            return self._portada() if metodo in ('GET', 'HEAD') else self._error(405, 'Usa GET.')
        if ruta == '/favicon.ico':
            self.send_response(204)
            self.send_header('Content-Length', '0')
            self._cerrar_si_queda_cuerpo()
            self.end_headers()
            return
        if ruta == '/v1/cecehub/pairing':
            return self._emparejar() if metodo == 'GET' else self._error(405, 'Usa GET.')
        if ruta == '/v1/cecehub/proof':
            return self._prueba() if metodo in ('GET', 'HEAD') else self._error(405, 'Usa GET.')
        # ---- a partir de aquí, todo pide permiso ----
        ok, por = self.hub.autorizar(self)
        if not ok:
            return self._denegar(por)
        self._acceso = por
        if ruta in ('/v1', '/v1/'):
            return self._json(200, {'service': 'cecehub', 'version': VERSION, 'openai_compatible': True})
        if ruta == '/v1/models' and metodo in ('GET', 'HEAD'):
            q = urllib.parse.parse_qs(self._query)
            todos = (q.get('all') or q.get('todos') or ['0'])[0] in ('1', 'true', 'si', 'sí')
            datos = [{'id': m, 'object': 'model', 'created': int(self.hub.inicio), 'owned_by': ia.nombre}
                     for m, ia in self.hub.enrutador.modelos(todos)]
            self._detalle = f'{len(datos)} modelos'
            return self._json(200, {'object': 'list', 'data': datos})
        if ruta.startswith('/v1/models/') and metodo == 'GET':
            m = urllib.parse.unquote(ruta[len('/v1/models/'):])
            ia = dict(self.hub.enrutador.modelos(True)).get(m)
            if not ia:
                return self._error(404, f'El modelo «{m}» no está en CeceHub.', cod='model_not_found')
            return self._json(200, {'id': m, 'object': 'model', 'created': int(self.hub.inicio), 'owned_by': ia.nombre})
        if ruta == '/v1/cecehub/status' and metodo in ('GET', 'HEAD'):
            return self._json(200, self.hub.estado(self._zona, por))
        if ruta == '/v1/cecehub/info' and metodo in ('GET', 'HEAD'):
            return self._json(200, self.hub.info())
        if ruta == '/v1/cecehub/motors' and metodo in ('GET', 'HEAD'):
            est = self.hub.enrutador.estado()
            return self._json(200, {
                'motors': [{'name': e['name'], 'type': 'local', 'status': 'connected' if e['ok'] else 'disconnected',
                            'models': e['models'], 'error': e['error'] or None} for e in est],
                'active_motor': next((e['name'] for e in est if e['ok']), 'none'),
                'active_model': self.hub.enrutador.activo})
        if ruta == '/v1/cecehub/select-model' and metodo == 'POST':
            cuerpo = self._leer_json()
            if cuerpo is None:
                return
            m = cuerpo.get('model') if isinstance(cuerpo, dict) else None
            if not isinstance(m, str) or m not in dict(self.hub.enrutador.modelos(True)):
                return self._error(404, f'El modelo «{m}» no está en CeceHub.', cod='model_not_found')
            self.hub.enrutador.activo = m
            return self._json(200, {'success': True, 'model': m})
        if ruta.startswith('/v1/cecehub/'):
            return self._error(404, 'No existe en CeceHub.', cod='not_found')
        if ruta.startswith('/v1/') and metodo in ('POST', 'GET'):
            if ruta_con_saltos(ruta):
                return self._error(400, 'Ruta no válida.', cod='invalid_path')
            return self._reenviar(metodo, ruta)
        if ruta.startswith('/v1/'):
            return self._error(405, 'Método no admitido.')
        return self._error(404, 'No existe en CeceHub.', cod='not_found')

    # ---------- piezas ----------
    def _preflight(self):
        self.send_response(204)
        self._cors()
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        pedidas = self.headers.get('Access-Control-Request-Headers') or ''
        pedidas = ', '.join(h.strip() for h in pedidas.split(',') if re.fullmatch(r'[A-Za-z0-9\-]{1,64}', h.strip()))
        self.send_header('Access-Control-Allow-Headers', pedidas or 'Authorization, Content-Type, X-CeceHub-Token')
        if (self.headers.get('Access-Control-Request-Private-Network') or '').lower() == 'true':
            self.send_header('Access-Control-Allow-Private-Network', 'true')   # Chrome: de una página a la red local
        self.send_header('Access-Control-Max-Age', '600')
        self.send_header('Content-Length', '0')
        self._cerrar_si_queda_cuerpo()
        self.end_headers()

    def _salud(self):
        h = self.hub
        necesita = self._zona == 'internet' or (self._zona == 'lan' and h.lan_token)
        o = {'service': 'cecehub', 'status': 'ok', 'version': VERSION, 'id': h.id, 'auth': 'token' if necesita else 'none'}
        if self._nombre_visible():
            o['name'] = h.nombre
        self._json(200, o)

    def _nombre_visible(self):
        """El nombre del equipo, ni por internet ni a una web cualquiera (CORS *): solo sin Origin, a Cece (null) o a la red,
        y con un Host de la red (una web con «DNS rebinding» llega con su propio dominio y sin Origin)"""
        return (self._zona != 'internet' and origen_de_red(self.headers.get('Origin'))
                and es_host_de_red(self.headers.get('Host'), self.hub.hosts_extra))

    def _denegar(self, por):
        if por == 'limite':
            return self._error(429, 'Demasiados códigos incorrectos desde aquí. Espera unos minutos.', 'rate_limit_error', 'too_many_attempts',
                               extra={'Retry-After': str(FALLOS_CODIGO[1])})
        if por == 'codigo_malo':
            return self._error(401, 'El código de CeceHub no es válido. Copia otra vez el enlace que enseña CeceHub.',
                               'authentication_error', 'invalid_token', extra={'WWW-Authenticate': 'Bearer realm="cecehub"'})
        if por == 'falta_codigo':
            return self._error(401, 'CeceHub pide el código para conectar desde aquí. Usa el enlace con código que enseña CeceHub.',
                               'authentication_error', 'token_required', extra={'WWW-Authenticate': 'Bearer realm="cecehub"'})
        if por == 'origen':
            return self._error(403, 'Esta página no puede usar CeceHub sin el código (solo Cece AI abierta como archivo o desde tu red).',
                               'permission_error', 'origin_not_allowed')
        if por == 'host':
            return self._error(403, 'Nombre de servidor no reconocido. Conecta por IP, por localhost o por cecehub.local (o usa el código).',
                               'permission_error', 'host_not_allowed')
        return self._error(403, 'Sin permiso.', 'permission_error')

    def _prueba(self):
        """Demuestra que este CeceHub conoce el código sin enseñarlo: HMAC-SHA256(código, «cecehub-proof:» + número de Cece).
        Así, en una WiFi ajena, Cece no le da tu código a un equipo que se hace pasar por tu CeceHub (cecehub.local, misma IP…)."""
        q = urllib.parse.parse_qs(self._query)
        n = (q.get('nonce') or [''])[0]
        if not RE_NONCE.fullmatch(n):
            return self._error(400, 'Falta «nonce» (16 a 128 letras, números, «-» o «_»).')
        firma = lambda m: hmac.new(self.hub.token.encode('utf-8'), m.encode('utf-8'), 'sha256').hexdigest()   # noqa: E731
        host = (self.headers.get('Host') or '').strip().lower()
        # proof_host lleva además el nombre:puerto al que se conectó el cliente. En este equipo y en la WiFi Cece exige esa:
        # un equipo que se hace pasar por tu CeceHub y le reenvía la pregunta al de verdad no la consigue con su dirección:
        #  · desde internet (puerto abierto en el router, IPv6 sin cortafuegos, túnel) no se da: por internet Cece usa «proof»;
        #  · si el Host es una IP, tiene que ser la de este equipo por la que llegó la conexión (la del impostor no lo es).
        ok_host = self._zona != 'internet'
        ip_host = ip_de(host_sin_puerto(host))
        if ok_host and ip_host is not None:
            try:
                ok_host = ip_host == ip_de(self.connection.getsockname()[0])
            except (OSError, IndexError, TypeError):
                ok_host = False
        self._json(200, {'id': self.hub.id, 'proof': firma('cecehub-proof:' + n),
                         'proof_host': firma(f'cecehub-proof:{n}:{host}') if ok_host else None})

    def _emparejar(self):
        """Código y enlaces para la portada. Solo desde este mismo equipo, abierta como localhost/127.0.0.1/[::1] (un nombre
        como trampa.local que una web apunta a 127.0.0.1 con «DNS rebinding» no vale) y desde la propia portada."""
        if self._zona != 'local' or not es_host_local(self.headers.get('Host')):
            return self._json(403, error_openai(f'Solo se ve desde el propio equipo de CeceHub, abriendo http://localhost:{self.hub.puerto}',
                                                'permission_error', 'local_only'), cors=False)
        origen = self.headers.get('Origin')
        sitio = (self.headers.get('Sec-Fetch-Site') or '').lower()
        p = partir_url(origen) if origen else None
        mismo = p is not None and p.netloc.lower() == (self.headers.get('Host') or '').strip().lower()
        if (origen and not mismo) or sitio not in ('', 'same-origin', 'none'):
            return self._json(403, error_openai('Solo desde la portada de CeceHub.', 'permission_error'), cors=False)
        self._json(200, self.hub.emparejamiento(), cors=False)

    def _portada(self):
        nombre = self.hub.nombre if self._nombre_visible() else 'CeceHub'
        aviso = ''
        if self._zona == 'local' and not es_host_local(self.headers.get('Host')):
            # el código y los enlaces solo se enseñan con localhost (contra «DNS rebinding»): se dice cómo abrirla
            url = f'http://localhost:{self.hub.puerto}'
            aviso = (f'<div class="card"><h2>🔑 ¿Buscas el enlace y el código?</h2><p>Por seguridad solo se enseñan si abres '
                     f'esta página como <a href="{url}/">{url}</a> en este mismo equipo.</p></div>')
        datos = (PORTADA.replace('{VERSION}', VERSION).replace('{AVISO}', aviso)
                 .replace('{NOMBRE}', html.escape(nombre)).encode('utf-8', 'replace'))
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(datos)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'")
        self.send_header('Referrer-Policy', 'no-referrer')
        self._cerrar_si_queda_cuerpo()
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(datos)

    def _leer_cuerpo(self):
        """bytes del cuerpo, o None si ya se respondió con un error"""
        te = (self.headers.get('Transfer-Encoding') or '').lower()
        if 'chunked' in te:
            partes, total = [], 0
            while True:
                linea = self.rfile.readline(1024)
                tam = linea.split(b';', 1)[0].strip()
                if not RE_TROZO.fullmatch(tam):    # solo cifras hexadecimales: int(b'-1', 16) leería hasta el final
                    self._error(400, 'Cuerpo «chunked» mal formado.')
                    return None
                n = int(tam, 16)
                if n == 0:
                    while self.rfile.readline(1024) not in (b'\r\n', b'\n', b''):
                        pass
                    break
                total += n
                if total > MAX_CUERPO:
                    self._error(413, 'La petición es demasiado grande.', cod='too_large')
                    return None
                partes.append(self.rfile.read(n))
                self.rfile.readline(4)
            self._cuerpo_pendiente = False
            return b''.join(partes)
        cl = (self.headers.get('Content-Length') or '0').strip()
        if not RE_LONGITUD.fullmatch(cl):
            self._error(400, 'Content-Length no válido.')
            return None
        n = int(cl)
        if n > MAX_CUERPO:
            self._error(413, 'La petición es demasiado grande.', cod='too_large')
            return None
        datos = self.rfile.read(n) if n else b''
        self._cuerpo_pendiente = False
        if len(datos) < n:
            self.close_connection = True
            return None
        return datos

    def _leer_json(self):
        datos = self._leer_cuerpo()
        if datos is None:
            return None
        try:
            return json.loads(datos.decode('utf-8')) if datos else {}
        except (ValueError, RecursionError):   # (RecursionError: [[[[[… muy anidado)
            self._error(400, 'El cuerpo no es JSON válido.')
            return None

    # ---------- reenvío a la IA ----------
    def _reenviar(self, metodo, ruta):
        cuerpo = b''
        pedido = {}
        ctype = ''
        crudo = False   # cuerpo que no es JSON (audio en multipart…): va tal cual, con su Content-Type
        if metodo == 'POST':
            cuerpo = self._leer_cuerpo()
            if cuerpo is None:
                return
            ctype = (self.headers.get('Content-Type') or '').strip()
            crudo = not cuerpo_es_json(ctype, cuerpo)
            if not crudo:
                try:
                    pedido = json.loads(cuerpo.decode('utf-8')) if cuerpo else {}
                except (ValueError, RecursionError):
                    return self._error(400, 'El cuerpo no es JSON válido.')
                if not isinstance(pedido, dict):
                    pedido = {}
        enr = self.hub.enrutador
        modelo = pedido.get('model') if isinstance(pedido.get('model'), str) else ''
        if crudo:
            # no se lee el cuerpo, así que no se enruta por modelo: a la IA del modelo activo o a la primera encendida
            ia = (enr.ia_para(enr.activo) if enr.activo else None) or (enr.encendidas() or [None])[0]
        else:
            if metodo == 'POST' and modelo.strip().lower() in ('', 'auto', 'cecehub', 'default'):
                enr.refrescar()
                if enr.activo:
                    modelo = enr.activo
                    pedido['model'] = modelo
                    try:
                        cuerpo = a_json(pedido)
                    except (ValueError, RecursionError):
                        return self._error(400, 'El cuerpo no es JSON válido.')
            ia = enr.ia_para(modelo) if modelo else (enr.encendidas() or [None])[0]
        if ia is None:
            if not enr.encendidas():
                return self._error(502, 'No hay ninguna IA encendida en el equipo de CeceHub (abre Ollama, LM Studio o llama.cpp).',
                                   'server_error', 'no_backend')
            disp = ', '.join(m for m, _ in enr.modelos()[:8]) or '—'
            return self._error(404, f'El modelo «{modelo}» no está en CeceHub. Hay: {disp}', cod='model_not_found')
        self._detalle = f'{(ctype.split(";")[0] or "?") if crudo else (modelo or "?")} @{ia.nombre}'
        destino = ia.ruta + ruta[len('/v1'):]
        q = self._query
        if q:
            destino += '?' + q
        acepta = self.headers.get('Accept') or '*/*'
        cab = ia.cabeceras({'Content-Type': ctype if crudo else 'application/json', 'Accept': acepta} if metodo == 'POST'
                           else {'Accept': acepta})
        flujo = bool(pedido.get('stream'))
        cola = queue.Queue()
        caja = {}
        hilo = threading.Thread(target=_trabajador_ia, args=(ia, metodo, destino, cuerpo if metodo == 'POST' else None, cab, cola, caja),
                                daemon=True, name='ia')
        hilo.start()
        try:
            self._bombear(cola, flujo)
        finally:
            _cortar(caja)

    def _bombear(self, cola, flujo):
        empezado = False
        t0 = time.time()
        while True:
            try:
                cosa = cola.get(timeout=1.0 if not empezado else LATIDO)
            except queue.Empty:
                if self._cliente_se_fue():
                    self.close_connection = True
                    self._detalle += ' · el cliente se fue'
                    return
                if flujo and not empezado and time.time() - t0 >= ESPERA_ANTES_DE_LATIR:
                    self._empezar_sse()   # la IA aún carga el modelo: se responde ya para que nadie corte la espera
                    empezado = True
                    self._trozo(b': cecehub: cargando el modelo...\n\n')
                elif empezado:
                    self._trozo(b': cecehub: sigue pensando...\n\n')
                continue
            tipo = cosa[0]
            if tipo == 'flujo':
                if not empezado:
                    self._empezar_sse()
                    empezado = True
            elif tipo == 'trozo':
                self._trozo(cosa[1])
            elif tipo == 'fin':
                self._fin_trozos()
                return
            elif tipo == 'entero':
                _, estado, ctype, datos = cosa
                if not empezado:
                    if estado >= 400:
                        self._detalle += f' · la IA dijo {estado}: {mensaje_de_error(datos, 120)}'
                    self.send_response(estado)
                    self._cors()
                    self.send_header('Content-Type', ctype or 'application/json')
                    self.send_header('Content-Length', str(len(datos)))
                    self.send_header('Cache-Control', 'no-store')
                    self._cerrar_si_queda_cuerpo()
                    self.end_headers()
                    self.wfile.write(datos)
                    return
                if estado >= 400:   # ya se había respondido 200 (latidos): el error va dentro del flujo, como lo entiende Cece
                    self._detalle += f' · la IA dijo {estado}: {mensaje_de_error(datos, 120)}'
                    self._evento_error(f'La IA respondió {estado}: {mensaje_de_error(datos)}', estado)
                else:
                    self._trozo(_json_a_sse(datos))
                self._fin_trozos()
                return
            elif tipo == 'error':
                e = cosa[1]
                tiempo = isinstance(e, (socket.timeout, TimeoutError))
                msg = ('La IA no responde (tiempo agotado).' if tiempo else
                       f'No se pudo hablar con la IA ({motivo_red(e)}). ¿Sigue abierta en el equipo de CeceHub?')
                self._detalle += ' · ' + motivo_red(e)
                if empezado:
                    self._evento_error(msg, 504 if tiempo else 502)
                    self._fin_trozos()
                else:
                    self._error(504 if tiempo else 502, msg, 'server_error', 'backend_timeout' if tiempo else 'backend_unreachable')
                return

    def _cliente_se_fue(self):
        """¿Cerró el navegador la conexión (pulsó ⏹, cerró la pestaña)? Así se deja de esperar a la IA."""
        try:
            listo, _, _ = select.select([self.connection], [], [], 0)
            if listo:
                return self.connection.recv(1, socket.MSG_PEEK) == b''
        except (OSError, ValueError):
            return True
        return False

    def _empezar_sse(self):
        # HTTP/1.0 no entiende «chunked»: se escribe tal cual y el final del flujo es el cierre de la conexión
        self._por_trozos = self.request_version not in ('HTTP/1.0', 'HTTP/0.9')
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
        self.send_header('Cache-Control', 'no-cache, no-transform')
        self.send_header('X-Accel-Buffering', 'no')    # que nginx/túneles no guarden el flujo
        if self._por_trozos:
            self.send_header('Transfer-Encoding', 'chunked')
            self._cerrar_si_queda_cuerpo()
        else:
            self.close_connection = True
            self.send_header('Connection', 'close')
        self.end_headers()

    def _trozo(self, datos):
        if datos:
            if getattr(self, '_por_trozos', True):
                self.wfile.write(b'%x\r\n%s\r\n' % (len(datos), datos))
            else:
                self.wfile.write(datos)
            self.wfile.flush()

    def _fin_trozos(self):
        if getattr(self, '_por_trozos', True):
            self.wfile.write(b'0\r\n\r\n')
        else:
            self.close_connection = True
        self.wfile.flush()

    def _evento_error(self, mensaje, codigo):
        ev = {'error': {'message': mensaje, 'type': 'server_error', 'code': codigo}}
        self._trozo(('data: ' + json.dumps(ev, ensure_ascii=False) + '\n\n').encode('utf-8', 'replace') + b'data: [DONE]\n\n')


def _trabajador_ia(ia, metodo, ruta, cuerpo, cab, cola, caja):
    """Habla con la IA en otro hilo: así el principal puede mandar latidos mientras espera"""
    c = r = None
    try:
        c = ia.conexion()
        caja['c'] = c
        if caja.get('cortado'):
            return
        c.request(metodo, ruta, body=cuerpo, headers=cab)
        caja['s'] = c.sock   # (si la IA cierra al acabar, getresponse() deja c.sock en None: _cortar usa esta)
        if caja.get('cortado'):
            return
        r = c.getresponse()
        ctype = r.getheader('Content-Type') or ''
        if 200 <= r.status < 300 and 'event-stream' in ctype.lower():
            cola.put(('flujo',))
            while not caja.get('cortado'):   # el cliente se fue: no se sigue leyendo (ni llenando la cola)
                b = r.read1(65536)
                if not b:
                    break
                cola.put(('trozo', b))
            cola.put(('fin',))
        else:
            cola.put(('entero', r.status, ctype, r.read(MAX_CUERPO)))
    except Exception as e:  # noqa: BLE001 — todo error se convierte en respuesta para Cece
        if not caja.get('cortado'):
            cola.put(('error', e))
    finally:
        for x in (r, c):
            if x is not None:
                try:
                    x.close()
                except Exception:
                    pass


def _cortar(caja):
    """El cliente se fue o ya terminó: se cierra la conexión con la IA (deja de generar)"""
    caja['cortado'] = True
    c = caja.get('c')
    try:
        s = caja.get('s') or (c.sock if c is not None else None)   # una sola lectura: el otro hilo puede estar cerrándola
        if s is not None:
            s.shutdown(socket.SHUT_RDWR)
    except (OSError, AttributeError):
        pass


def _json_a_sse(datos):
    """Respuesta entera (sin streaming) convertida en un evento SSE, por si ya se había empezado a latir"""
    try:
        j = json.loads(datos.decode('utf-8'))
        ch = (j.get('choices') or [{}])[0]
        msg = ch.get('message') or {}
        trozo = {'id': j.get('id', 'cecehub'), 'object': 'chat.completion.chunk', 'model': j.get('model'),
                 'choices': [{'index': 0, 'delta': {'role': 'assistant', 'content': msg.get('content') or ''},
                              'finish_reason': ch.get('finish_reason') or 'stop'}]}
        if j.get('usage'):
            trozo['usage'] = j['usage']
        return ('data: ' + json.dumps(trozo, ensure_ascii=False) + '\n\ndata: [DONE]\n\n').encode('utf-8', 'replace')
    except (ValueError, AttributeError, IndexError, KeyError, TypeError, RecursionError):
        ev = {'error': {'message': 'La IA respondió algo que no se entiende.', 'type': 'server_error'}}
        return ('data: ' + json.dumps(ev) + '\n\ndata: [DONE]\n\n').encode('utf-8')


# =====================================================================================
#  El hub: zonas, permisos, estado y arranque
# =====================================================================================
class Hub:
    def __init__(self, cfg, puerto=None, puerto_internet=None, host='', nombre=None, ias=None, lan_token=None,
                 internet=None, tunel=None, url_publica=None, aviso=None, mdns=None):
        self.cfg = cfg
        self.id = cfg.get('id')
        self.token = os.environ.get('CECEHUB_TOKEN') or cfg.get('token')
        if not RE_TOKEN.fullmatch(str(self.token or '')):
            raise ValueError('CECEHUB_TOKEN tiene que tener de 24 a 128 letras, números, «-» o «_» (uno corto se podría adivinar)')
        # (cecehub.json se puede editar a mano: un valor del tipo que no es no puede tumbar el arranque con una traza)
        texto = lambda k: cfg.get(k) if isinstance(cfg.get(k), str) else None   # noqa: E731
        self.nombre = (nombre or texto('name') or nombre_equipo())[:40]
        try:
            self.puerto = int(puerto if puerto is not None else (os.environ.get('CECEHUB_PORT') or cfg.get('port') or PUERTO))
            self.puerto_internet = int(puerto_internet if puerto_internet is not None else cfg.get('internet_port') or PUERTO_INTERNET)
        except (TypeError, ValueError):
            raise ValueError('el puerto (CECEHUB_PORT, «port» o «internet_port» en cecehub.json) tiene que ser un número') from None
        if not (0 <= self.puerto <= 65535 and 0 <= self.puerto_internet <= 65535):
            raise ValueError('el puerto tiene que estar entre 1 y 65535')
        self.host = host
        self.lan_token = bool(cfg.get('lan_token', False) if lan_token is None else lan_token)
        self.internet = bool(cfg.get('internet', False) if internet is None else internet)
        self.tipo_tunel = tunel or texto('tunnel') or 'auto'
        if self.tipo_tunel not in ('auto', 'cloudflared', 'ngrok', 'ssh'):
            log.warning('⚠️  «tunnel» en la configuración no es auto, cloudflared, ngrok ni ssh: uso auto.')
            self.tipo_tunel = 'auto'
        self.url_fija = normalizar_url_publica(url_publica if url_publica is not None else (texto('public_url') or ''))
        self.aviso_activo = cfg.get('beacon', True) if aviso is None else aviso
        self.mdns_activo = cfg.get('mdns', True) if mdns is None else mdns
        extra = cfg.get('allowed_hosts', [])
        self.hosts_extra = [h for h in (extra if isinstance(extra, list) else []) if isinstance(h, str)]
        if ias is None:
            ias = []
            lista = cfg.get('backends') if isinstance(cfg.get('backends'), list) and cfg.get('backends') else IAS_DE_FABRICA
            for b in lista:
                if not isinstance(b, dict):
                    continue
                url = os.environ.get(b.get('env', ''), '') or b.get('url', '')
                try:
                    ias.append(IA(str(b.get('name') or url), url, str(b.get('api_key') or '')))
                except ValueError as e:
                    log.warning('⚠️  IA ignorada en la configuración (%s)', e)
        self.enrutador = Enrutador(ias)
        self.limitador = Limitador()
        self.inicio = time.time()
        self.url_publica = self.url_fija or None
        self.proveedor_tunel = 'manual' if self.url_fija else None
        self.puerto_internet_real = None
        self.ip6 = None
        self.servidores = []
        self.tunel = None
        self.hilos_extra = []
        self._parar = threading.Event()

    # ---------- zonas y permisos ----------
    def zona(self, p):
        if p.server.solo_internet:
            return 'internet'
        if any(h in p.headers for h in CABECERAS_PROXY):
            return 'internet'
        ip = ip_de(p.client_address[0])
        if ip is None:
            return 'internet'
        if ip.is_loopback:
            return 'local'
        if es_ip_lan(ip):
            return 'lan'
        if ip.version == 6 and self.ip6 is not None and int(ip) >> 64 == int(self.ip6) >> 64:
            return 'lan'
        return 'internet'

    def autorizar(self, p):
        """(True, 'token'|'abierto') o (False, motivo)"""
        cliente = p._cliente()
        dado = None
        auth = p.headers.get('Authorization') or ''
        if auth[:7].lower() == 'bearer ':
            dado = auth[7:].strip()
        elif p.headers.get('X-CeceHub-Token'):
            dado = p.headers.get('X-CeceHub-Token').strip()
        necesita = p._zona == 'internet' or (p._zona == 'lan' and self.lan_token)
        # con el código bueno se entra siempre: si no, quien prueba códigos desde la misma IP que tú (todo lo que llega
        # por un túnel sin cabeceras de proxy viene de 127.0.0.1) te dejaría fuera. Adivinarlo es imposible (≥ 144 bits).
        if dado and hmac.compare_digest(dado.encode('utf-8', 'replace'), self.token.encode('utf-8')):
            return True, 'token'
        # el castigo es de la zona internet (clave aparte): en casa no se puede dejar a nadie fuera con cabeceras inventadas
        clave = clave_limite(cliente)
        if necesita and self.limitador.bloqueado(clave):
            return False, 'limite'
        if dado:
            if necesita:
                self.limitador.fallo(clave)
                log.warning('🔑 Código incorrecto desde %s (%s)', limpio(cliente, 64), p._zona)
                return False, 'codigo_malo'
            # en casa no hace falta código: uno antiguo no impide conectar (pero se avisa en /status)
        if necesita:
            return False, 'falta_codigo'
        if not origen_de_red(p.headers.get('Origin')):
            return False, 'origen'
        if not es_host_de_red(p.headers.get('Host'), self.hosts_extra):
            return False, 'host'
        return True, 'open'

    # ---------- información ----------
    def estado(self, zona, acceso):
        self.enrutador.refrescar()
        return {
            'service': 'cecehub', 'status': 'ok', 'version': VERSION, 'id': self.id, 'name': self.nombre,
            'uptime_seconds': int(time.time() - self.inicio), 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
            'models_count': len(self.enrutador.modelos()), 'active_model': self.enrutador.activo,
            'zone': zona, 'access': acceso,
            'internet': {'enabled': bool(self.internet or self.url_fija), 'online': bool(self.url_publica),
                         'provider': self.proveedor_tunel},
            # solo a quien ya tiene el código: dónde más se puede llegar a este CeceHub
            **({'links': {'internet': self.url_publica, 'lan': self.urls_lan(), 'tailscale': self.urls_tailscale()}}
               if acceso == 'token' else {}),
        }

    def info(self):
        return {'name': 'CeceHub', 'version': VERSION, 'id': self.id, 'hub_name': self.nombre, 'port': self.puerto,
                'platform': 'Python ' + platform.python_version(), 'built': '2026-10-08',
                'features': ['openai_compatible', 'streaming', 'multiple_backends', 'model_routing', 'lan_discovery',
                             'mdns', 'internet_tunnel', 'token_auth', 'token_proof', 'tailscale']}

    def urls_lan(self):
        return [f'http://{ip}:{self.puerto}' for ip in ips_locales() if es_ip_lan(ip)]

    def urls_tailscale(self):
        return [f'http://{ip}:{self.puerto}' for ip in ip_tailscale()]

    def enlace(self, base):
        return f'{base.rstrip("/")}/#cecehub={self.token}'

    def emparejamiento(self):
        lan = self.urls_lan()
        return {
            'name': self.nombre, 'id': self.id, 'token': self.token, 'version': VERSION,
            'local': f'http://localhost:{self.puerto}', 'lan': lan, 'mdns': f'http://{NOMBRES_MDNS_BASE}.local:{self.puerto}',
            'lan_token': self.lan_token, 'lan_links': [self.enlace(u) for u in lan] if self.lan_token else [],
            'internet': self.url_publica, 'internet_link': self.enlace(self.url_publica) if self.url_publica else None,
            'tailscale_links': [self.enlace(u) for u in self.urls_tailscale()],
            'internet_enabled': bool(self.internet or self.url_fija), 'tunnel': self.proveedor_tunel,
            'backends': self.enrutador.estado(), 'models': [m for m, _ in self.enrutador.modelos()],
        }

    def poner_url_publica(self, url, proveedor):
        self.url_publica = url.rstrip('/')
        self.proveedor_tunel = proveedor
        imprimir_enlace_internet(self)
        h = threading.Thread(target=comprobar_enlace, args=(self, self.url_publica), daemon=True, name='comprobar')
        h.start()

    def quitar_url_publica(self):
        if not self.url_fija:
            self.url_publica = None

    def proveedor_actual(self):
        """Por dónde llega lo de internet: 'manual' (--public-url), 'cloudflared', 'ngrok', 'ssh' o None (no se sabe)"""
        if self.url_fija:
            return 'manual'
        t = self.tunel
        return (t.proveedor if t is not None and t.proveedor else None) or self.proveedor_tunel

    # ---------- arranque y parada ----------
    def iniciar(self):
        self.ip6 = ip6_global()
        self.enrutador.refrescar(forzar=True, esperar=True)
        # API para este equipo y la WiFi (IPv4 + IPv6 si se puede)
        try:
            if self.host:
                fam = socket.AF_INET6 if ':' in self.host else socket.AF_INET
                srv = ServidorHub((self.host, self.puerto), self, familia=fam)
            else:
                try:
                    srv = ServidorHub(('::', self.puerto), self, familia=socket.AF_INET6)
                except OSError as e:
                    if getattr(e, 'errno', None) in (98, 48, 10048):   # ocupado: no tiene sentido probar IPv4
                        raise
                    srv = ServidorHub(('0.0.0.0', self.puerto), self)
        except OSError as e:
            raise SystemExit(f'❌ No puedo abrir el puerto {self.puerto}: {e}.\n'
                             f'   ¿Ya hay otro CeceHub abierto? Ciérralo o usa otro puerto: --port {self.puerto + 10}') from None
        self.puerto = srv.server_address[1]
        self._servir(srv)
        # puerto de internet: solo en 127.0.0.1 y TODO con código
        if self.internet or self.url_fija:
            try:
                si = ServidorHub(('127.0.0.1', self.puerto_internet), self, solo_internet=True)
            except OSError as e:
                log.warning('⚠️  El puerto de internet %s está ocupado (%s): uso uno libre cualquiera.', self.puerto_internet, e)
                si = ServidorHub(('127.0.0.1', 0), self, solo_internet=True)
            self.puerto_internet_real = si.server_address[1]
            self._servir(si)
        if self.aviso_activo:
            self._hilo(AvisoUDP(self).bucle, 'aviso')
        if self.mdns_activo:
            self._hilo(Mdns(self).bucle, 'mdns')

    def iniciar_tunel(self):
        if self.url_fija:
            threading.Thread(target=comprobar_enlace, args=(self, self.url_fija), daemon=True, name='comprobar').start()
        if self.internet and not self.url_fija and self.puerto_internet_real and not self.tunel:
            self.tunel = Tunel(self, self.tipo_tunel, self.puerto_internet_real)
            self.tunel.iniciar()

    def _servir(self, srv):
        self.servidores.append(srv)
        self._hilo(lambda: srv.serve_forever(poll_interval=0.5), 'http')

    def _hilo(self, f, nombre):
        h = threading.Thread(target=f, daemon=True, name=nombre)
        h.start()
        self.hilos_extra.append(h)

    def parar(self):
        self._parar.set()
        if self.tunel:
            self.tunel.parar()
        for s in self.servidores:
            try:
                s.shutdown()
                s.server_close()
            except Exception:
                pass

    def esperar(self):
        try:
            while not self._parar.wait(1):
                pass
        except KeyboardInterrupt:
            pass


# =====================================================================================
#  Internet: túnel https gratuito (cloudflared → ngrok → ssh a localhost.run)
# =====================================================================================
RE_URL_TUNEL = {
    'cloudflared': re.compile(r'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com\b', re.I),   # (api.… sale en sus errores)
    'ngrok': re.compile(r'"url"\s*:\s*"(https://[^"\s]+)"|\burl=(https://\S+)', re.I),
    'ssh': re.compile(r'https://(?!admin\.|www\.|docs\.)[a-z0-9][a-z0-9-]*\.(?:lhr\.life|lhr\.rocks|localhost\.run)\b', re.I),
}
AVISOS_TUNEL = [
    (re.compile(r'429 Too Many Requests|rate.?limit|status 429', re.I), 'el servicio de túneles gratuitos está saturado o te ha limitado; lo reintento solo'),
    (re.compile(r'provisioning failed with status (?:401|403)|failed to request quick tunnel', re.I),
     'Cloudflare no ha dejado crear el túnel: tu red (colegio, trabajo, antivirus) puede bloquear trycloudflare.com. '
     'Prueba otra red o --tunnel ssh'),
    (re.compile(r'config(uration)? file .*present|cannot determine default configuration', re.I),
     'cloudflared tiene un config.yml en ~/.cloudflared: los túneles rápidos no funcionan con él (muévelo de sitio)'),
    (re.compile(r'authentication failed|authtoken|ERR_NGROK_4018', re.I),
     'ngrok necesita tu authtoken: ngrok config add-authtoken TU_TOKEN (o instala cloudflared)'),
    (re.compile(r'Permission denied \(publickey|Host key verification failed', re.I), 'ssh a localhost.run no pudo entrar'),
    (re.compile(r'Could not resolve hostname|no such host|failed to dial|dial tcp|network is unreachable|i/o timeout', re.I),
     'no llega a internet (¿sin conexión o un cortafuegos bloquea la salida?)'),
]


def url_en_linea(proveedor, linea):
    m = RE_URL_TUNEL[proveedor].search(linea)
    if not m:
        return None
    if proveedor == 'ngrok':
        return (m.group(1) or m.group(2)).rstrip('/"')
    return m.group(0).rstrip('/')


def carpeta_bin():
    for d in (os.path.join(AQUI, 'bin'), os.path.join(os.path.expanduser('~'), '.cecehub', 'bin')):
        try:
            os.makedirs(d, exist_ok=True)
            if os.access(d, os.W_OK):
                return d
        except OSError:
            continue
    return tempfile.gettempdir()


def buscar_cloudflared():
    exe = 'cloudflared.exe' if os.name == 'nt' else 'cloudflared'
    for d in (os.path.join(AQUI, 'bin'), os.path.join(os.path.expanduser('~'), '.cecehub', 'bin')):
        p = os.path.join(d, exe)
        if os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    return shutil.which('cloudflared')


def archivo_cloudflared():
    """(nombre del archivo en las versiones de cloudflared, ¿es .tgz?) para este sistema, o None"""
    so = platform.system()
    maq = platform.machine().lower()
    arq = ('amd64' if maq in ('x86_64', 'amd64') else 'arm64' if maq in ('arm64', 'aarch64') else
           'arm' if maq.startswith('arm') else '386' if maq in ('i386', 'i686', 'x86') else None)
    if not arq:
        return None
    if so == 'Linux':
        return f'cloudflared-linux-{arq}', False
    if so == 'Darwin' and arq in ('amd64', 'arm64'):
        return f'cloudflared-darwin-{arq}.tgz', True
    if so == 'Windows' and arq in ('amd64', '386'):
        return f'cloudflared-windows-{arq}.exe', False
    return None


def descargar_cloudflared():
    """Descarga cloudflared (el cliente oficial de Cloudflare, de su GitHub) en ./bin. Devuelve la ruta o None."""
    a = archivo_cloudflared()
    if not a:
        log.error('❌ No hay cloudflared para este sistema (%s %s). Instálalo a mano: '
                  'https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/',
                  platform.system(), platform.machine())
        return None
    nombre, tgz = a
    url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/' + nombre
    carpeta = carpeta_bin()
    destino = os.path.join(carpeta, 'cloudflared.exe' if os.name == 'nt' else 'cloudflared')
    log.info('⬇️  Descargando cloudflared (cliente oficial de Cloudflare, ~40 MB) en %s…', destino)
    # Todo se hace en temporales de la misma carpeta y solo se pone en su sitio cuando está entero y arranca:
    # una descarga cortada o un archivo que no funciona no se quedan en ./bin (si no, se usarían la próxima vez).
    sufijo = '.exe' if os.name == 'nt' else '.descarga'   # (en Windows solo se ejecuta si acaba en .exe)
    temporales = []

    def temporal():
        fd, ruta = tempfile.mkstemp(prefix='.cloudflared-', suffix=sufijo, dir=carpeta)
        temporales.append(ruta)
        return fd, ruta
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'CeceHub/' + VERSION})
        with urllib.request.urlopen(req, timeout=60) as r:
            esperado = (r.headers.get('Content-Length') or '').strip()
            fd, descarga = temporal()
            with os.fdopen(fd, 'wb') as f:
                shutil.copyfileobj(r, f, 1024 * 1024)
                total = f.tell()
        if RE_LONGITUD.fullmatch(esperado) and total != int(esperado):
            raise OSError(f'descarga incompleta ({total} de {esperado} bytes): se cortó la conexión')
        if total == 0:
            raise OSError('descarga vacía')
        binario = descarga
        if tgz:
            fd, binario = temporal()
            with tarfile.open(descarga) as t, os.fdopen(fd, 'wb') as dst:
                miembro = next((m for m in t.getmembers() if os.path.basename(m.name) == 'cloudflared' and m.isfile()), None)
                if not miembro:
                    raise OSError('el .tgz no trae cloudflared')
                with t.extractfile(miembro) as src:
                    shutil.copyfileobj(src, dst)
        os.chmod(binario, 0o755)
        r = subprocess.run([binario, '--version'], capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            raise OSError('no arranca: ' + (r.stderr or r.stdout or '').strip()[:200])
        for intento in range(5):   # (en Windows el antivirus puede tenerlo abierto un momento tras ejecutarlo)
            try:
                os.replace(binario, destino)
                break
            except PermissionError:
                if intento == 4:
                    raise
                time.sleep(0.5)
        version = ((r.stdout or r.stderr or '').strip().splitlines() or ['?'])[0]
        log.info('✅ cloudflared listo: %s', limpio(version, 80))
        return destino
    except Exception as e:  # noqa: BLE001
        log.error('❌ No pude descargar cloudflared (%s). Descárgalo a mano de %s y ponlo en %s',
                  limpio(motivo_red(e), 200), url, carpeta)
        return None
    finally:
        for t in temporales:
            try:
                os.remove(t)
            except OSError:
                pass


class Tunel:
    def __init__(self, hub, tipo, puerto):
        self.hub, self.tipo, self.puerto = hub, tipo, puerto
        self.proc = None
        self.proveedor = None
        self.ultimas = deque(maxlen=30)
        self._parar = threading.Event()
        self._lock = threading.Lock()   # parar() y el arranque del proceso no se cruzan: nunca queda uno sin matar

    def iniciar(self):
        threading.Thread(target=self._bucle, daemon=True, name='tunel').start()

    def parar(self):
        with self._lock:
            self._parar.set()
            p = self.proc
        _terminar(p)

    def _comando(self, prov):
        local = f'http://127.0.0.1:{self.puerto}'
        if prov == 'cloudflared':
            exe = buscar_cloudflared() or descargar_cloudflared()
            return [exe, 'tunnel', '--no-autoupdate', '--url', local] if exe else None
        if prov == 'ngrok':
            exe = shutil.which('ngrok')
            return [exe, 'http', local, '--log', 'stdout', '--log-format', 'json'] if exe else None
        if prov == 'ssh':
            exe = shutil.which('ssh')
            # BatchMode: nunca se queda pidiendo una contraseña o una confirmación en la terminal de CeceHub
            return [exe, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=20',
                    '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3', '-o', 'ExitOnForwardFailure=yes',
                    '-R', f'80:127.0.0.1:{self.puerto}', 'nokey@localhost.run'] if exe else None
        return None

    def _bucle(self):
        candidatos = ['cloudflared', 'ngrok', 'ssh'] if self.tipo == 'auto' else [self.tipo]
        i, fallos, espera = 0, 0, 3
        while not self._parar.is_set():
            prov = candidatos[i]
            cmd = self._comando(prov)   # (puede tardar: descarga de cloudflared)
            if self._parar.is_set():
                return
            if not cmd:
                if i + 1 < len(candidatos):
                    i += 1
                    continue
                log.error('❌ Internet: no hay forma de abrir el túnel (%s). Instala cloudflared '
                          '(python3 cecehub-server.py --install-cloudflared) o usa --public-url si tienes tu propio acceso.',
                          ', '.join(candidatos))
                return
            self.proveedor = prov
            log.info('🌍 Abriendo el túnel a internet con %s…', prov)
            obtuvo = self._ejecutar(prov, cmd)
            if self._parar.is_set():
                return
            self.hub.quitar_url_publica()
            if obtuvo:
                fallos, espera = 0, 3
            else:
                fallos += 1
                if self.tipo == 'auto' and fallos >= 2 and i + 1 < len(candidatos):
                    log.warning('🌍 %s no consigue abrir el túnel; pruebo con otra forma.', prov)
                    i, fallos, espera = i + 1, 0, 3
                    continue
            log.warning('🌍 El túnel (%s) se ha cerrado; lo vuelvo a abrir en %s s.%s', prov, espera, self._motivo())
            self._parar.wait(espera)
            espera = min(espera * 2, 60)

    def _motivo(self):
        """La última línea que explica algo (errores primero), corta: no el cartel de bienvenida de la herramienta"""
        lineas = list(self.ultimas)
        mal = [x for x in lineas if re.search(r'\b(ERR|error|failed|fatal|denied|refused|unable|cannot)\b', x, re.I)]
        x = (mal or lineas or [''])[-1]
        x = re.sub(r'^\S+Z\s+(INF|ERR|WRN)\s+', '', x).strip()
        return f' Motivo: {x[:160]}' if x else ''

    def _ejecutar(self, prov, cmd):
        obtuvo = False
        avisados = set()
        with self._lock:
            if self._parar.is_set():    # parar() llegó mientras se preparaba (p. ej. descargando cloudflared)
                return False
            try:
                proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.PIPE,
                                        text=True, encoding='utf-8', errors='replace', bufsize=1)
            except (OSError, ValueError) as e:
                log.error('❌ No pude ejecutar %s: %s', cmd[0], e)
                return False
            self.proc = proc
        if self._parar.is_set():   # (con el lock no debería pasar, pero si pasa no queda nada vivo)
            _terminar(proc)
            return False
        for linea in proc.stdout:
            linea = limpio(linea.rstrip(), 300)   # (la salida de la herramienta puede traer colores/ESC)
            if not linea:
                continue
            self.ultimas.append(linea)
            log.debug('[%s] %s', prov, linea)
            url = url_en_linea(prov, linea)
            if url and url != self.hub.url_publica:
                obtuvo = True
                self.hub.poner_url_publica(url, prov)
            for i, (re_aviso, texto) in enumerate(AVISOS_TUNEL):
                if i not in avisados and re_aviso.search(linea):
                    avisados.add(i)
                    log.warning('🌍 %s: %s', prov, texto)
            if self._parar.is_set():
                break
        if self._parar.is_set():
            _terminar(proc)
        try:
            proc.wait(10)
        except subprocess.TimeoutExpired:
            _terminar(proc)
        return obtuvo


def _terminar(p):
    """Termina un proceso (y, si no hace caso en 5 s, lo mata). Nunca lanza."""
    if p is None:
        return
    try:
        if p.poll() is None:
            p.terminate()
            p.wait(5)
    except Exception:  # noqa: BLE001
        try:
            p.kill()
            p.wait(5)
        except Exception:  # noqa: BLE001
            pass


def comprobar_enlace(hub, url):
    """Prueba el enlace desde internet (como lo haría Cece) y dice si funciona"""
    ultimo = None
    fin = time.time() + 90
    while time.time() < fin and hub.url_publica == url and not hub._parar.is_set():
        try:
            req = urllib.request.Request(url + '/health', headers={'User-Agent': 'CeceHub/' + VERSION, 'ngrok-skip-browser-warning': '1'})
            with urllib.request.urlopen(req, timeout=10) as r:
                j = json.loads(r.read(4096).decode('utf-8'))
            if j.get('service') == 'cecehub' and j.get('id') == hub.id:
                log.info('✅ Comprobado: el enlace de internet funciona.')
                return True
            ultimo = 'responde otra cosa'
        except Exception as e:  # noqa: BLE001
            ultimo = motivo_red(e)
        hub._parar.wait(4)
    if hub.url_publica == url and not hub._parar.is_set():
        log.warning('⚠️  El enlace todavía no responde desde internet (%s). A veces tarda un minuto; si no, '
                    'reinicia CeceHub o prueba --tunnel ssh.', ultimo)
    return False


# =====================================================================================
#  WiFi: aviso UDP (puerto 9998) y nombre cecehub.local (mDNS)
# =====================================================================================
class AvisoUDP:
    """Cada 5 s dice «aquí hay un CeceHub» a toda la red; y contesta enseguida a quien pregunta (--scan)"""
    def __init__(self, hub):
        self.hub = hub

    def mensaje(self):
        h = self.hub
        return json.dumps({'cecehub': 2, 'id': h.id, 'name': h.nombre, 'port': h.puerto, 'version': VERSION,
                           'token': h.lan_token}).encode('utf-8', 'replace')

    def responder(self, datos, de):
        """Respuesta (bytes) a un paquete recibido, o None. Solo a este equipo y a las redes de casa (con una IP pública
        serviría de «reflector» para atacar a otros). Nunca lanza: un paquete raro ([[[[…) no puede tumbar el aviso."""
        try:
            if not origen_udp_valido(de[0]):
                return None
            j = json.loads(bytes(datos).decode('utf-8'))
        except (ValueError, RecursionError, TypeError, IndexError):
            return None
        if isinstance(j, dict) and j.get('cecehub_query'):
            return self.mensaje()
        return None

    def bucle(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        except OSError as e:
            log.debug('Aviso UDP no disponible: %s', e)
            return
        if hasattr(socket, 'SO_REUSEPORT'):
            try:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
            except OSError:
                pass
        escucha = True
        try:
            s.bind(('', PUERTO_AVISO))
        except OSError as e:
            escucha = False
            log.debug('Aviso UDP: no puedo escuchar en %s (%s); solo anuncio.', PUERTO_AVISO, e)
        s.settimeout(1.0)
        siguiente = 0.0
        while not self.hub._parar.is_set():
            try:
                if time.time() >= siguiente:
                    try:
                        s.sendto(self.mensaje(), ('255.255.255.255', PUERTO_AVISO))
                    except OSError as e:
                        log.debug('Aviso UDP: %s', e)
                    siguiente = time.time() + 5
                if not escucha:
                    self.hub._parar.wait(1)
                    continue
                try:
                    datos, de = s.recvfrom(2048)
                except (socket.timeout, OSError):
                    continue
                r = self.responder(datos, de)
                if r:
                    try:
                        s.sendto(r, de)
                    except OSError:
                        pass
            except Exception as e:  # noqa: BLE001 — pase lo que pase con un paquete, el aviso sigue vivo
                log.debug('Aviso UDP: %s', limpio(e, 200))
                self.hub._parar.wait(0.2)
        s.close()


def leer_aviso(datos):
    """Aviso de otro CeceHub (para --scan), comprobado: {'id', 'name', 'port', 'version', 'token'} o None. Nunca lanza
    (lo manda cualquiera de la red: puede venir roto, muy anidado, con tipos raros o con secuencias ESC en el nombre)."""
    try:
        j = json.loads(bytes(datos).decode('utf-8'))
    except (ValueError, RecursionError, TypeError):
        return None
    if not isinstance(j, dict) or not j.get('cecehub'):
        return None
    id_, nombre, puerto, version = j.get('id'), j.get('name', ''), j.get('port'), j.get('version', '')
    if not isinstance(id_, str) or not id_ or len(id_) > 64 or not isinstance(nombre, str) or not isinstance(version, str):
        return None
    if isinstance(puerto, bool) or not isinstance(puerto, int) or not 0 < puerto < 65536:
        return None
    return {'id': limpio(id_, 64), 'name': limpio(nombre, 40), 'port': puerto, 'version': limpio(version, 20),
            'token': j.get('token') is True}


def mdns_nombre(datos, pos, saltos=0):
    """Lee un nombre DNS (con punteros de compresión). Devuelve (nombre, posición tras el nombre)."""
    partes = []
    fin = None
    while True:
        if pos >= len(datos) or saltos > 20:
            raise ValueError('nombre DNS roto')
        n = datos[pos]
        if n == 0:
            pos += 1
            break
        if n & 0xC0 == 0xC0:
            if pos + 1 >= len(datos):
                raise ValueError('puntero DNS roto')
            destino = ((n & 0x3F) << 8) | datos[pos + 1]
            if fin is None:
                fin = pos + 2
            pos = destino
            saltos += 1
            continue
        partes.append(datos[pos + 1:pos + 1 + n].decode('utf-8', 'replace'))
        pos += 1 + n
    return '.'.join(partes), (fin if fin is not None else pos)


def mdns_preguntas(datos):
    """(id, es_pregunta, [(nombre, tipo, clase, quiere_unicast)]) de un paquete DNS/mDNS"""
    if len(datos) < 12:
        raise ValueError('paquete corto')
    ident, flags, nq = struct.unpack('!HHH', datos[:6])
    pos, out = 12, []
    for _ in range(nq):
        nombre, pos = mdns_nombre(datos, pos)
        if pos + 4 > len(datos):
            raise ValueError('pregunta corta')
        tipo, clase = struct.unpack('!HH', datos[pos:pos + 4])
        pos += 4
        out.append((nombre.lower().rstrip('.'), tipo, clase & 0x7FFF, bool(clase & 0x8000)))
    return ident, not (flags & 0x8000), out


def mdns_codificar(nombre):
    return b''.join(bytes([len(p)]) + p for p in (x.encode('utf-8') for x in nombre.split('.')) if p) + b'\x00'


def mdns_respuesta(ident, preguntas, ip, ttl=120, con_preguntas=False):
    """Respuesta con un A (IPv4) por cada pregunta A/ANY, y un NSEC «no tengo IPv6» por cada AAAA"""
    respuestas = []
    for nombre, tipo, _, _ in preguntas:
        n = mdns_codificar(nombre)
        if tipo in (1, 255):
            respuestas.append(n + struct.pack('!HHIH', 1, 0x8001, ttl, 4) + socket.inet_aton(ip))
        elif tipo == 28:
            rdata = n + b'\x00\x01\x40'   # ventana 0, 1 byte, solo el tipo A
            respuestas.append(n + struct.pack('!HHIH', 47, 0x8001, ttl, len(rdata)) + rdata)
    if not respuestas:
        return None
    qs = b''.join(mdns_codificar(nm) + struct.pack('!HH', t, 1) for nm, t, _, _ in preguntas) if con_preguntas else b''
    cab = struct.pack('!HHHHHH', ident if con_preguntas else 0, 0x8400, len(preguntas) if con_preguntas else 0, len(respuestas), 0, 0)
    return cab + qs + b''.join(respuestas)


class Mdns:
    """Responde «cecehub.local» (y cecehub-<id>.local) con la IP de este equipo en la WiFi"""
    def __init__(self, hub):
        self.hub = hub
        self.nombres = {f'{NOMBRES_MDNS_BASE}.local', f'{NOMBRES_MDNS_BASE}-{hub.id[:4]}.local'}

    @staticmethod
    def ip_para(quien):
        """IP de este equipo en la red de quien pregunta (la de la interfaz por la que se le llega: con una VPN 10.x
        no se le da esa). Si no se puede saber (pregunta este mismo equipo…), la primera de la WiFi (192.168.x antes)."""
        ip = ip_hacia(quien)
        if ip and es_ip_lan(ip):
            return ip
        ips = [x for x in ips_locales() if es_ip_lan(x)]
        return ips[0] if ips else None

    def responder(self, datos, de):
        """(respuesta, a dónde) para un paquete mDNS, o None. Solo a este equipo y a las redes de casa. Nunca lanza."""
        try:
            if not origen_udp_valido(de[0]):
                return None    # (un equipo con IP pública no hace de «reflector»)
            ident, es_preg, preguntas = mdns_preguntas(bytes(datos))
        except (ValueError, struct.error, RecursionError, TypeError, IndexError):
            return None
        if not es_preg:
            return None
        mias = {}
        for q in preguntas:   # (sin repetidas: 1000 preguntas iguales no dan 1000 respuestas)
            if q[0] in self.nombres:
                mias.setdefault((q[0], q[1]), q)
        mias = list(mias.values())[:8]
        if not mias:
            return None
        ip = self.ip_para(de[0])
        if not ip:
            return None
        legado = de[1] != MDNS[1]               # pregunta «normal» (unicast): se contesta a ella, con su id
        try:
            r = mdns_respuesta(ident, mias, ip, ttl=10 if legado else 120, con_preguntas=legado)
        except (ValueError, OSError, struct.error):
            return None
        if not r:
            return None
        if legado:
            return r, de
        if any(q[3] for q in mias):
            return r, (de[0], MDNS[1])
        return r, MDNS

    def bucle(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        except OSError as e:
            log.info('ℹ️  cecehub.local no disponible en este equipo (%s). Se encuentra igual buscando en la WiFi.', e)
            return
        if hasattr(socket, 'SO_REUSEPORT'):
            try:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
            except OSError:
                pass
        try:
            s.bind(('', MDNS[1]))
            s.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, socket.inet_aton(MDNS[0]) + socket.inet_aton('0.0.0.0'))
            s.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 255)
            s.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_LOOP, 1)
        except OSError as e:
            log.info('ℹ️  cecehub.local no disponible en este equipo (%s). Se encuentra igual buscando en la WiFi.', e)
            s.close()
            return
        s.settimeout(1.0)
        while not self.hub._parar.is_set():
            try:
                try:
                    datos, de = s.recvfrom(9000)
                except (socket.timeout, OSError):
                    continue
                r = self.responder(datos, de)
                if r:
                    try:
                        s.sendto(*r)
                    except OSError as e:
                        log.debug('mDNS: %s', e)
            except Exception as e:  # noqa: BLE001 — un paquete raro nunca mata cecehub.local
                log.debug('mDNS: %s', limpio(e, 200))
                self.hub._parar.wait(0.2)
        s.close()


def escanear(segundos=3.0):
    """--scan: pregunta a la WiFi qué CeceHub hay (aviso UDP) y prueba cecehub.local"""
    print(f'🔎 Buscando CeceHub en esta red ({segundos:.0f} s)…')
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        s.bind(('', 0))
    except OSError as e:
        print(f'  ❌ No puedo usar UDP en este equipo ({e}).')
        s.close()
        return 1
    s.settimeout(0.3)
    pregunta = json.dumps({'cecehub_query': 1}).encode()
    destinos = {'255.255.255.255'} | {ip.rsplit('.', 1)[0] + '.255' for ip in ips_locales()}
    for d in destinos:
        try:
            s.sendto(pregunta, (d, PUERTO_AVISO))
        except OSError:
            pass
    vistos = {}
    fin = time.time() + segundos
    while time.time() < fin:
        try:
            datos, de = s.recvfrom(2048)
        except (socket.timeout, OSError):
            continue
        j = leer_aviso(datos)   # (ya comprobado: tipos, tamaño, sin caracteres de control)
        if j and j['id'] not in vistos:
            vistos[j['id']] = (de[0], j)
    s.close()
    for ip, j in vistos.values():
        print(f'  ✅ «{j["name"]}» → http://{ip}:{j["port"]}  (v{j["version"]}{", con código" if j["token"] else ""})')
    try:
        ip = socket.getaddrinfo(f'{NOMBRES_MDNS_BASE}.local', None, socket.AF_INET)[0][4][0]
        print(f'  ✅ cecehub.local → {ip}')
    except (OSError, IndexError, UnicodeError):
        print('  ➖ cecehub.local no responde (normal en algunas redes o sistemas)')
    if not vistos:
        print('  ➖ Ningún CeceHub contestó al aviso UDP. ¿Está abierto? ¿El cortafuegos deja pasar Python? ¿La WiFi aísla a los equipos (redes de invitados)?')
    return 0


# =====================================================================================
#  Pantalla
# =====================================================================================
def qr_terminal(texto):
    try:
        import qrcode  # opcional: pip install qrcode
    except ImportError:
        return
    try:
        q = qrcode.QRCode(border=1)
        q.add_data(texto)
        q.print_ascii(invert=True)
    except Exception:
        pass


def imprimir_enlace_internet(hub):
    url = hub.url_publica
    if not url:
        return
    enlace = hub.enlace(url)
    print(f'\n🌍 POR INTERNET (desde cualquier sitio) — vía {hub.proveedor_tunel}', flush=True)
    print(f'   Enlace: {enlace}')
    print('   En Cece AI: Configuración → 📴 Sin conexión → CeceHub → pega el enlace → 🌍 Conectar')
    print('   ⚠️  Quien tenga este enlace puede usar tus IAs. Para invalidarlo: --new-token')
    if hub.proveedor_tunel not in ('manual',):
        print('   (Este enlace cambia cada vez que se abre el túnel; para uno fijo usa --public-url)')
    qr_terminal(enlace)
    print(flush=True)


def imprimir_portada(hub):
    est = hub.enrutador.estado()
    print(f'\n🔗 CeceHub {VERSION} · «{hub.nombre}» · id {hub.id}')
    print('─' * 60)
    partes = [f'{e["name"]} ({e["models"]} modelos)' if e['ok'] else f'{e["name"]} ({e["error"]})' for e in est]
    print('🧠 IAs: ' + ' · '.join(partes))
    modelos = [m for m, _ in hub.enrutador.modelos()]
    if modelos:
        print('   Modelos: ' + ', '.join(modelos[:12]) + (f' y {len(modelos) - 12} más' if len(modelos) > 12 else ''))
    else:
        print('   ⚠️  Ninguna IA encendida: abre Ollama, LM Studio o llama.cpp (CeceHub las verá solo, sin reiniciar).')
    print(f'\n💻 En este equipo:  http://localhost:{hub.puerto}')
    lan = hub.urls_lan()
    if lan:
        print(f'📶 Por la WiFi:     {lan[0]}' + ''.join(f'\n                   {u}' for u in lan[1:]))
        print(f'                   (o http://{NOMBRES_MDNS_BASE}.local:{hub.puerto})' + ('  — pide código (--lan-token)' if hub.lan_token else ''))
        if hub.lan_token:
            print(f'   Enlace WiFi con código: {hub.enlace(lan[0])}')
    else:
        print('📶 Por la WiFi:     sin red local ahora mismo')
    for u in hub.urls_tailscale():
        print(f'🔒 Por Tailscale:   {hub.enlace(u)}  (desde cualquier sitio de tu tailnet, con código)')
    if hub.internet or hub.url_fija:
        if hub.url_publica:
            imprimir_enlace_internet(hub)
        else:
            print(f'🌍 Por internet:    abriendo el túnel… (puerto interno {hub.puerto_internet_real}, todo con código)')
    else:
        print('🌍 Por internet:    apagado — arranca con --internet para usarlo desde cualquier sitio')
    print('\nEn Cece AI: Configuración → 📴 Sin conexión → CeceHub → Conectar.')
    print(f'Portada con el enlace y el código: http://localhost:{hub.puerto}   ·   Ctrl+C para parar\n', flush=True)


def diagnostico(cfg, args):
    print(f'🩺 Diagnóstico de CeceHub {VERSION}\n')
    print(f'Python {platform.python_version()} en {platform.system()} {platform.release()} ({platform.machine()})')
    print(f'Configuración: {cfg.ruta}  · id {cfg.get("id")} · código {"✅" if cfg.get("token") else "❌"}')
    hub = Hub(cfg, puerto=args.port, nombre=args.name, ias=ias_de_args(args), aviso=False, mdns=False)
    print('\n🧠 IAs:')
    for e in hub.enrutador.estado():
        print(f'  {"✅" if e["ok"] else "❌"} {e["name"]:<10} {e["url"]:<32} ' + (f'{e["models"]} modelos' if e['ok'] else e['error']))
    mods = [m for m, _ in hub.enrutador.modelos()]
    print('  Modelos: ' + (', '.join(mods) if mods else '—'))
    print('\n🔌 Puertos:')
    for p, que, h in ((hub.puerto, 'API (este equipo + WiFi)', '0.0.0.0'), (hub.puerto_internet, 'internet (solo 127.0.0.1)', '127.0.0.1')):
        s = socket.socket()
        try:
            s.bind((h, p))
            print(f'  ✅ {p} libre — {que}')
        except OSError as e:
            print(f'  ⚠️  {p} ocupado — {que} ({e}). ¿Ya hay un CeceHub abierto?')
        finally:
            s.close()
    print('\n📶 Red:')
    ips = ips_locales()
    print('  IPs de este equipo: ' + (', '.join(ips) if ips else 'ninguna (¿sin WiFi?)'))
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        if hasattr(socket, 'SO_REUSEPORT'):
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
        s.bind(('', MDNS[1]))
        print('  ✅ mDNS (cecehub.local) se puede anunciar')
    except OSError as e:
        print(f'  ➖ mDNS no disponible ({e}); se encontrará buscando en la WiFi')
    finally:
        s.close()
    if platform.system() == 'Windows':
        print('  ℹ️  Windows: la primera vez, permite «Python» en redes privadas cuando lo pregunte el cortafuegos.')
    elif platform.system() == 'Darwin':
        print('  ℹ️  macOS: si el cortafuegos pregunta, pulsa «Permitir» para que la WiFi llegue a CeceHub.')
    print('\n🌍 Internet:')
    cf = buscar_cloudflared()
    print(f'  {"✅" if cf else "➖"} cloudflared: {cf or "no está (se descarga solo con --internet, o --install-cloudflared)"}')
    print(f'  {"✅" if shutil.which("ngrok") else "➖"} ngrok: {shutil.which("ngrok") or "no está"}')
    print(f'  {"✅" if shutil.which("ssh") else "➖"} ssh (localhost.run): {shutil.which("ssh") or "no está"}')
    try:
        urllib.request.urlopen(urllib.request.Request('https://www.cloudflare.com/cdn-cgi/trace', headers={'User-Agent': 'CeceHub'}), timeout=6).read(200)
        print('  ✅ Este equipo llega a internet')
    except Exception as e:  # noqa: BLE001
        print(f'  ❌ Este equipo no llega a internet ({motivo_red(e)})')
    return 0


PORTADA = r'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CeceHub</title><style>
:root{color-scheme:light dark;--bg:#0e1016;--fg:#e9ecf3;--mut:#9aa3b5;--card:#171a23;--line:#262b38;--acc:#8aa2ff;--ok:#3fd18f;--bad:#ff6f8e}
@media (prefers-color-scheme:light){:root{--bg:#f5f6fa;--fg:#161a24;--mut:#596274;--card:#fff;--line:#e3e6ee;--acc:#3d55d6;--ok:#11905a;--bad:#c62f52}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:740px;margin:0 auto;padding:28px 16px 40px}h1{font-size:26px;margin:0 0 4px}.mut{color:var(--mut)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:14px 0}
.card h2{font-size:15px;margin:0 0 8px;letter-spacing:.2px}code{font:13.5px ui-monospace,Menlo,Consolas,monospace;word-break:break-all}
.fila{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0}.fila code{flex:1;min-width:200px;padding:8px 10px;background:var(--bg);border:1px solid var(--line);border-radius:8px}
button{font:inherit;font-size:14px;padding:7px 12px;border-radius:8px;border:1px solid var(--acc);background:transparent;color:var(--acc);cursor:pointer}
button:hover{background:var(--acc);color:var(--bg)}a{color:var(--acc)}.ok{color:var(--ok)}.bad{color:var(--bad)}ol{margin:6px 0 0 18px;padding:0}li{margin:3px 0}
</style></head><body><main>
<h1>🔗 CeceHub</h1><div class="mut">Funcionando · v{VERSION} · «{NOMBRE}»</div>
{AVISO}<div id="esEnlace" class="card" hidden><h2>📋 Esto es un enlace de conexión para Cece AI</h2>
<p>Cópialo y pégalo en <b>Cece AI → Configuración → 📴 Sin conexión → CeceHub</b>, y pulsa <b>🌍 Conectar</b>.</p>
<div class="fila"><code id="esEnlaceTxt"></code><button data-copiar="esEnlaceTxt">Copiar</button></div></div>
<div id="priv"></div>
<div class="card"><h2>Cómo conectar Cece AI</h2><ol>
<li>Abre Cece AI → <b>Configuración → 📴 Sin conexión</b>.</li>
<li>En <b>🔗 CeceHub</b> pulsa <b>Conectar</b>: lo encuentra solo si está en este equipo o en tu misma WiFi.</li>
<li>Desde otro sitio: arranca CeceHub con <code>--internet</code> y pega en Cece AI el enlace de internet.</li></ol></div>
<script>
(function(){
  var $=function(i){return document.getElementById(i)};
  document.addEventListener('click',function(e){var b=e.target.closest('[data-copiar]');if(!b)return;
    var t=$(b.getAttribute('data-copiar')).textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent='¡Copiado!'},function(){var r=document.createRange();r.selectNodeContents($(b.getAttribute('data-copiar')));getSelection().removeAllRanges();getSelection().addRange(r);b.textContent='Pulsa Ctrl+C'});});
  if(/[#&]cecehub=/.test(location.hash)){$('esEnlace').hidden=false;$('esEnlaceTxt').textContent=location.href;}
  function fila(txt,id){var d=document.createElement('div');d.className='fila';var c=document.createElement('code');c.id=id;c.textContent=txt;var b=document.createElement('button');b.textContent='Copiar';b.setAttribute('data-copiar',id);d.appendChild(c);d.appendChild(b);return d}
  function card(t){var c=document.createElement('div');c.className='card';var h=document.createElement('h2');h.textContent=t;c.appendChild(h);$('priv').appendChild(c);return c}
  function p(c,t,cl){var e=document.createElement('p');e.textContent=t;if(cl)e.className=cl;c.appendChild(e);return e}
  fetch('/v1/cecehub/pairing',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){
    if(!j)return;var n=0;
    var c=card('🌍 Por internet');
    if(j.internet_link){p(c,'Pega este enlace en Cece AI (desde cualquier sitio). Quien lo tenga puede usar tus IAs.');c.appendChild(fila(j.internet_link,'l'+(n++)));}
    else if(j.internet_enabled){p(c,'Abriendo el túnel… recarga en unos segundos.','mut');}
    else{p(c,'Apagado. Arranca CeceHub con --internet para usarlo desde cualquier sitio.','mut');}
    if(j.tailscale_links&&j.tailscale_links.length){var t=card('🔒 Por Tailscale');p(t,'Desde cualquier equipo de tu tailnet (no cambia nunca). Lleva el código: no lo compartas.');j.tailscale_links.forEach(function(u){t.appendChild(fila(u,'l'+(n++)))});}
    var w=card('📶 Por la WiFi'+(j.lan_token?' (con código)':''));
    if(j.lan.length){(j.lan_token?j.lan_links:j.lan).forEach(function(u){w.appendChild(fila(u,'l'+(n++)))});p(w,'También: '+j.mdns,'mut');}
    else p(w,'Este equipo no está en ninguna red ahora mismo.','mut');
    var ia=card('🧠 IAs de este equipo');
    j.backends.forEach(function(b){p(ia,(b.ok?'✅ ':'➖ ')+b.name+' — '+(b.ok?b.models+' modelos':b.error),b.ok?'':'mut')});
  }).catch(function(){});
})();
</script></main></body></html>'''


# =====================================================================================
#  Arranque
# =====================================================================================
def ias_de_args(args):
    if not args.backend:
        return None
    out = []
    for b in args.backend:
        nombre, _, url = b.partition('=') if '=' in b and not b.lower().startswith('http') else ('', '', b)
        ia = IA(nombre or url, url)
        if not nombre:
            ia.nombre = f'{ia.host}:{ia.puerto}'
        out.append(ia)
    return out


def argumentos(argv=None):
    a = argparse.ArgumentParser(prog='cecehub-server.py', description='CeceHub: tus IAs locales para Cece AI, en este equipo, por WiFi y por internet.')
    a.add_argument('--port', type=int, help=f'puerto de la API (de fábrica {PUERTO})')
    a.add_argument('--host', default='', help='escuchar solo en esta dirección (de fábrica: todas)')
    a.add_argument('--name', help='nombre que se ve en Cece AI (de fábrica: el del equipo)')
    a.add_argument('--backend', action='append', metavar='[NOMBRE=]URL',
                   help='IA a usar (se puede repetir), p. ej. Ollama=http://127.0.0.1:11434/v1. De fábrica: Ollama, LM Studio y llama.cpp')
    a.add_argument('--internet', action='store_true', default=None, help='abrir también por internet (túnel https gratuito + código)')
    a.add_argument('--tunnel', choices=['auto', 'cloudflared', 'ngrok', 'ssh'], help='cómo abrir el túnel (de fábrica: auto)')
    a.add_argument('--public-url', help='tu propia dirección pública (Tailscale Funnel, dominio, puerto abierto…) que llega al puerto de internet')
    a.add_argument('--internet-port', type=int, help=f'puerto interno (127.0.0.1) del túnel; todo pide código (de fábrica {PUERTO_INTERNET})')
    a.add_argument('--lan-token', action='store_true', default=None, help='pedir el código también en la WiFi')
    a.add_argument('--no-discovery', action='store_true', help='no anunciarse en la WiFi (ni aviso UDP ni cecehub.local)')
    a.add_argument('--config', help='archivo de configuración (de fábrica: cecehub.json junto a este programa)')
    a.add_argument('--new-token', action='store_true', help='cambiar el código: los enlaces de antes dejan de valer')
    a.add_argument('--show-token', action='store_true', help='enseñar el código y salir')
    a.add_argument('--check', action='store_true', help='diagnóstico y salir')
    a.add_argument('--scan', action='store_true', help='buscar CeceHub en esta WiFi y salir')
    a.add_argument('--install-cloudflared', action='store_true', help='descargar cloudflared en ./bin y salir')
    a.add_argument('-v', '--verbose', action='store_true', help='registro detallado')
    a.add_argument('--version', action='version', version=f'CeceHub {VERSION}')
    return a.parse_args(argv)


def main(argv=None):
    consola_utf8()
    args = argumentos(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose or os.environ.get('DEBUG', '').lower() in ('1', 'true') else logging.INFO,
                        format='[%(asctime)s] %(message)s', datefmt='%H:%M:%S', stream=sys.stdout)
    try:
        cfg = Config(ruta_config(args.config))
        if args.name:
            cfg.datos['name'] = args.name[:40]
            cfg.guardar()
        if args.new_token:
            cfg.nuevo_token()
            print('🔑 Código nuevo: los enlaces y equipos de antes ya no conectan por internet. Copia el enlace nuevo en Cece AI.')
    except ErrorConfig as e:
        print(f'❌ {e}')
        return 2
    if args.show_token:
        print(cfg.get('token'))
        return 0
    if args.scan:
        return escanear()
    if args.install_cloudflared:
        return 0 if descargar_cloudflared() else 1
    if args.check:
        try:
            return diagnostico(cfg, args)
        except ValueError as e:
            print(f'❌ {e}')
            return 2
    try:
        hub = Hub(cfg, puerto=args.port, puerto_internet=args.internet_port, host=args.host, nombre=args.name, ias=ias_de_args(args),
                  lan_token=args.lan_token, internet=args.internet, tunel=args.tunnel, url_publica=args.public_url,
                  aviso=False if args.no_discovery else None, mdns=False if args.no_discovery else None)
    except ValueError as e:
        print(f'❌ {e}')
        return 2
    try:
        signal.signal(signal.SIGTERM, lambda *_: hub._parar.set())
    except (ValueError, AttributeError):
        pass
    hub.iniciar()
    imprimir_portada(hub)
    hub.iniciar_tunel()
    hub.esperar()
    print('\n👋 Cerrando CeceHub…')
    hub.parar()
    return 0


def procesos_en_la_consola():
    """Cuántos procesos comparten esta consola de Windows (0 si no se sabe)"""
    try:
        import ctypes
        lista = (ctypes.c_uint32 * 16)()
        return int(ctypes.windll.kernel32.GetConsoleProcessList(lista, 16))
    except Exception:  # noqa: BLE001 — sin ctypes, sin consola…: no se sabe
        return 0


def esperar_si_ventana_propia():
    """Windows, abierto con doble clic: la ventana es solo de CeceHub (y, como mucho, del lanzador py.exe) y se cerraría
    sin dejar leer el error. Entonces se espera a Enter. Nunca en Linux/macOS ni dentro de otra consola (cmd, PowerShell…)."""
    if not WINDOWS:
        return
    try:
        if 1 <= procesos_en_la_consola() <= 2 and sys.stdin is not None and sys.stdin.isatty():
            input('\nPulsa Enter para cerrar…')
    except Exception:  # noqa: BLE001 — (EOF, consola cerrada…): se sale sin más
        pass


def arrancar(argv=None):
    """main() con salida limpia: los errores se explican (sin traza si son conocidos) y, en una ventana propia de Windows,
    no se cierra sin dejar leerlos"""
    try:
        codigo = main(argv)
    except KeyboardInterrupt:
        return 130
    except SystemExit as e:
        codigo = e.code
        if isinstance(codigo, str):     # (p. ej. «No puedo abrir el puerto…»)
            print(codigo, file=sys.stderr, flush=True)
            codigo = 1
    except Exception:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        print('❌ CeceHub se ha cerrado por un error inesperado (arriba, el detalle).', file=sys.stderr, flush=True)
        codigo = 1
    if codigo not in (0, None):
        esperar_si_ventana_propia()
    return codigo


if __name__ == '__main__':
    sys.exit(arrancar())
