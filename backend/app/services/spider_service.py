import httpx
from bs4 import BeautifulSoup
from typing import List
import urllib.parse
import re

async def search_jobs(platform: str, keyword: str, location: str = "nuevo-leon", limit: int = 3) -> List[str]:
    """Busca una palabra clave en una plataforma y devuelve URLs de vacantes."""
    links = []
    
    # Normalizar keyword para URL
    kw_url = urllib.parse.quote(keyword.strip().replace(" ", "-").lower())
    loc_url = urllib.parse.quote(location.strip().replace(" ", "-").lower())
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "es-419,es;q=0.9,en;q=0.8"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            if platform.lower() == "computrabajo":
                url = f"https://mx.computrabajo.com/trabajo-de-{kw_url}-en-{loc_url}"
                print(f"[SPIDER] Buscando en Computrabajo: {url}")
                res = await client.get(url, headers=headers)
                soup = BeautifulSoup(res.text, "html.parser")
                
                # En Computrabajo los links suelen estar en <a class="js-o-link"> o href que contiene /ofertas-de-trabajo/
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if "/ofertas-de-trabajo/" in href and not "salario" in href:
                        full_url = href if href.startswith("http") else f"https://mx.computrabajo.com{href}"
                        if full_url not in links:
                            links.append(full_url)
                        if len(links) >= limit:
                            break
                            
            elif platform.lower() == "occ":
                url = f"https://www.occ.com.mx/empleos/de-{kw_url}/en-{loc_url}/"
                print(f"[SPIDER] Buscando en OCC: {url}")
                res = await client.get(url, headers=headers)
                soup = BeautifulSoup(res.text, "html.parser")
                
                # En OCC los links contienen /empleo/
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if "/empleo/" in href and "-oferta-" in href:
                        full_url = href if href.startswith("http") else f"https://www.occ.com.mx{href}"
                        if full_url not in links:
                            links.append(full_url)
                        if len(links) >= limit:
                            break
                            
    except Exception as e:
        print(f"[SPIDER] Error buscando en {platform}: {e}")
        
    return links
