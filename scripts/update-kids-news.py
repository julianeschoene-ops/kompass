import json,re,datetime,urllib.request,html
from html.parser import HTMLParser
class Headlines(HTMLParser):
 def __init__(self): super().__init__();self.a=None;self.items=[];self.text=''
 def handle_starttag(self,t,a):
  if t=='a':
   d=dict(a);u=d.get('href','')
   self.a=u if u.startswith('/') and ('/artikel/' in u or '/video/' in u or u.endswith('-100.html')) else None;self.text=''
 def handle_data(self,d):
  if self.a:self.text+=d
 def handle_endtag(self,t):
  if t=='a' and self.a:
   title=' '.join(self.text.split())
   if 24<=len(title)<=125 and not title.lower().startswith(('mehr','logo!','jetzt','alle')):
    self.items.append({'title':title,'url':'https://www.logo.de'+self.a})
   self.a=None
req=urllib.request.Request('https://www.logo.de/',headers={'User-Agent':'Mozilla/5.0 KOMPASS school news'})
with urllib.request.urlopen(req,timeout=25) as r: page=r.read().decode('utf-8','replace')
p=Headlines();p.feed(page)
seen=set();items=[]
for item in p.items:
 if item['title'] not in seen:items.append(item);seen.add(item['title'])
 if len(items)>=5:break
if not items:raise RuntimeError('Keine verifizierbaren logo!-Nachrichten gefunden; bestehende Datei bleibt erhalten')
today=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=1))).date().isoformat()
with open('daily-kids-news.json','w',encoding='utf8') as f:json.dump({'updated':today,'source':'ZDF logo!','items':items},f,ensure_ascii=False,indent=2)
