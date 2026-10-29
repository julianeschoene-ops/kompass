"""Read editorial headline links in logo!'s main content, never navigation."""
import datetime
import json
import re
import urllib.request
from html.parser import HTMLParser
from zoneinfo import ZoneInfo
from pathlib import Path


class Headlines(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_main = False
        self.heading = None
        self.link = None
        self.text = []
        self.items = []

    def handle_starttag(self, tag, attrs):
        if tag == 'main':
            self.in_main = True
        if self.in_main and tag in ('h2', 'h3'):
            self.heading = tag
        if tag == 'a' and self.in_main and self.heading:
            href = dict(attrs).get('href', '')
            # Include article/video IDs such as -102 as well as -100.
            if re.fullmatch(r'/[a-zA-Z0-9_/-]+-\d+\.html', href):
                self.link = href
                self.text = []

    def handle_data(self, value):
        if self.link:
            self.text.append(value)

    def handle_endtag(self, tag):
        if tag == 'a' and self.link:
            title = ' '.join(''.join(self.text).split())
            if 12 <= len(title) <= 180 and not title.startswith('Thema:') and not re.search(r'(?:sendung|logo-vom)-', self.link):
                self.items.append({'title': title, 'url': 'https://www.logo.de' + self.link})
            self.link = None
        if tag == self.heading:
            self.heading = None
        if tag == 'main':
            self.in_main = False


def extract(page):
    parser = Headlines()
    parser.feed(page)
    seen = set()
    items = []
    for item in parser.items:
        if item['url'] not in seen:
            items.append(item)
            seen.add(item['url'])
        if len(items) == 5:
            break
    if not items:
        raise RuntimeError('Keine logo!-Schlagzeilen gefunden; bestehende Datei bleibt erhalten')
    return items



class Article(HTMLParser):
    """Use the child-friendly editorial introduction, never navigation labels."""
    def __init__(self):
        super().__init__()
        self.metadata = {}

    def handle_starttag(self, tag, attrs):
        if tag != 'meta':
            return
        attrs = dict(attrs)
        key = attrs.get('property') or attrs.get('name')
        if key and attrs.get('content'):
            self.metadata[key.lower()] = ' '.join(attrs['content'].split())


def enrich(item, page, previous=None):
    article = Article()
    article.feed(page)
    # Keep a prepared paraphrase for a known article; otherwise use its editorial
    # introduction from the children's newsroom, which already uses simple language.
    summary = (previous or {}).get('summary', '').strip()
    if not summary:
        summary = article.metadata.get('description') or article.metadata.get('og:description', '')
    if len(summary) < 35 or summary == item['title']:
        return None
    if len(summary.split()) > 65:
        sentences = re.split(r'(?<=[.!?])\s+', summary)
        summary = ' '.join(sentences[:2])
    published = article.metadata.get('article:published_time', '')[:10]
    if not published:
        match = re.search(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})', page)
        published = match.group(1) if match else (previous or {}).get('published', '')
    return {**item, 'summary': summary, **({'published': published} if published else {})}


def fetch_page(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 KOMPASS school news'})
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read().decode('utf-8', 'replace')

def main():
    target = Path('daily-kids-news.json')
    old = json.loads(target.read_text(encoding='utf-8')) if target.exists() else {}
    previous = {item['url']: item for item in old.get('items', []) if item.get('summary')}
    items = []
    for item in extract(fetch_page('https://www.logo.de/')):
        try:
            result = enrich(item, fetch_page(item['url']), previous.get(item['url']))
            if result:
                items.append(result)
        except Exception as error:
            print('Artikel nicht geladen:', item['url'], str(error))
    if not items:
        raise RuntimeError('Keine Kindernachrichten mit Kurztext gefunden; vorhandene Texte bleiben erhalten')
    today = datetime.datetime.now(ZoneInfo('Europe/Berlin')).date().isoformat()
    temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps({'updated': today, 'source': 'ZDF logo!', 'items': items}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(target)


if __name__ == '__main__':
    main()
