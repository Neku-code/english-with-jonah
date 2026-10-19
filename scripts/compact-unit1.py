"""Author the concise, automatically graded Unit 1 revision from its archived source."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = json.loads((ROOT/'content/archive/unit1-2026-10-19.3/display.json').read_text())
original_keys = json.loads((ROOT/'content/archive/unit1-2026-10-19.3/keys.json').read_text())
VERSION = '2026-10-19.4'
selected = [
 [2,3,4,5,6,7,9,10,12,15,16,24],
 [1,2,3,4,5,6,7,8,9,10,11,12],
 [1,2,3,4,5,6,7,8,10,11,12,24],
 [1,2,3,5,6,7,8,9,10,11,12,22],
 [1,3,4,5,6,7,8,9,10,11,22,23],
]
models = [
 [
 ('I am · You are', "I — men. You — sen/siz.\nI bilan am, you bilan are ishlatiladi.\nI am Ben. — Men Benman.\nYou are a student. — Siz talabasiz.\nGap tartibi: kim + am/is/are + ma’lumot."),
 ('He / She / It · We / They', "He — u (erkak), she — u (ayol), it — u/bu (narsa). Ular bilan is ishlatiladi.\nHe is a student. She is a teacher. It is a phone.\nWe — biz; they — ular. We va they bilan are ishlatiladi.\nWe are classmates. They are students."),
 ('Qisqa shakl · a / an', "I am = I’m. You are = you’re. He is = he’s. She is = she’s.\nIt is = it’s. We are = we’re. They are = they’re.\nBitta kasb/narsa: a student, a teacher, a phone. Unli tovush oldidan: an app.\nKo‘plik: students, teachers, phones. They are students. Ko‘plik oldidan a/an qo‘yilmaydi."),
 ],
 [
 ('Joylashuv: at / in / on', "Am/is/are bilan qayerda ekanimizni ham aytamiz.\nI am at home. — Men uydaman. We are at university. — Biz universitetdamiz.\nHe is in the library. — U kutubxonada. She is in the classroom. — U sinfxonada.\nThe phone is on the desk. — Telefon stol ustida."),
 ('Qayerdan? · Qayerda?', "From — qayerdan ekanini bildiradi: I’m from Boston. — Men Bostondanman.\nIn — hozirgi shahar/joyni bildiradi: I’m in Chicago. — Men Chikagodaman.\nShe is from New York. She is in Boston. — U Nyu-Yorkdan. U hozir Bostonda.\nFrom va in bir xil ma’no bermaydi."),
 ('Holat: tired / busy / open / closed', "I am tired. — Men charchaganman. She is busy. — U band.\nWe are ready. — Biz tayyormiz. They are late. — Ular kechikkan.\nThe cafe is open. — Qahvaxona ochiq. The cafe is closed. — Qahvaxona yopiq.\nHolat so‘zidan oldin a/an qo‘yilmaydi; ko‘plikda ham -s qo‘shilmaydi: They are busy."),
 ],
 [
 ('Inkor: am/is/are + not', "Inkor gapda am/is/are dan keyin not qo‘yiladi.\nI am not tired. — Men charchamaganman.\nShe is not a student. — U talaba emas.\nThey are not teachers. — Ular o‘qituvchi emas.\nNot qo‘shilganda gapning qolgan qismi saqlanadi."),
 ('Inkorning qisqa shakllari', "I am not = I’m not. I amn’t shakli ishlatilmaydi.\nHe is not = he isn’t / he’s not. She is not = she isn’t / she’s not.\nIt is not = it isn’t / it’s not.\nYou/we/they are not = you/we/they aren’t yoki you’re/we’re/they’re not."),
 ('Faktni to‘g‘rilash', "Alex isn’t at home. He’s in the library. — Alex uyda emas. U kutubxonada.\nWe aren’t teachers. We’re students. — Biz o‘qituvchi emasmiz. Biz talabamiz.\nTo‘g‘ri tartib: He is not busy. He not is busy deyilmaydi.\nThey aren’t tired. Holat so‘zidan oldin a/an kerak emas."),
 ],
 [
 ('Am / Is / Are bilan savol', "Savol tuzishda am/is/are oldinga chiqadi.\nYou are busy. → Are you busy?\nShe is ready. → Is she ready?\nThey are at home. → Are they at home?\nI am late. → Am I late?"),
 ('Qisqa javob: Yes / No', "Are you ready? — Yes, I am. / No, I’m not.\nIs she a teacher? — Yes, she is. / No, she isn’t.\nIs it a phone? — Yes, it is. / No, it isn’t.\nAre they classmates? — Yes, they are. / No, they aren’t.\nTasdiq qisqa javobida qisqartirmang: Yes, I am. Yes, she is. Yes, I’m deyilmaydi."),
 ('Kimga savol berilyapti?', "Ikki kishidan so‘rashdi: Are you classmates? — Yes, we are.\nSiz ham kirgan guruh: Are we late? — No, we aren’t.\nAlex sizdan o‘zi haqida so‘radi: Am I late? — No, you aren’t.\nInkor javobda har ikkisi to‘g‘ri: No, she is not. / No, she isn’t. / No, she’s not."),
 ],
 [
 ('Where / What / How', "Where — qayerda; where ... from — qayerdan.\nWhere are you? — I’m in the library.\nWhere are you from? — I’m from Boston.\nWhat is it? — It’s a phone. How are you? — I’m fine.\nSavol tartibi: savol so‘zi + am/is/are + kim/nima. From so‘zi oxirida keladi."),
 ('Who? · Ismingiz nima?', "Who — kim. Who is she? — She’s Anna. Who are they? — They’re Emma and Ben.\nWhat is your name? — My name is Emma.\nName — ism. My — mening. Your — sening/sizning.\nWhat is = what’s; who is = who’s; where is = where’s; how is = how’s."),
 ('Nima? · Qalaysiz?', "What is it? — It’s an app. What are they? — They’re phones.\nHow are you? — I’m fine. How is Ben? — He’s tired, but he’s ready.\nFine — yaxshi. But — lekin.\nWhere are you? joylashuvni, Where are you from? kelib chiqishni so‘raydi.\nWhere you are? emas, Where are you? deb so‘raladi."),
 ],
]
result=[]; keys=copy.deepcopy(original_keys)
for index, old in enumerate(source):
 lesson=copy.deepcopy(old); lesson.update(version=VERSION,flow='windows',automatic=True)
 by_number={t['number']:t for s in old['sections'] for t in s['items'] if t['kind']=='task'}
 sections=[]; new_keys={}
 if index<5:
  for group,(title,text) in enumerate(models[index]):
   ident=f"{old['id']}-window-model{group+1}"
   sections.append({'id':ident,'title':title,'items':[{'kind':'text','id':ident+'-text','text':text}]})
   for old_number in selected[index][group*4:group*4+4]:
    task=copy.deepcopy(by_number[old_number]); rule=copy.deepcopy(original_keys[old['id']]['tasks'][task['id']])
    task['number']=len(new_keys)+1; task['listening']=False
    if index==4 and old_number==10:
     task['prompt']='Emma o‘zini tanishtiryapti. Gapni to‘liq yozing: My name is ___. Ma’lumot: Uning ismi Emma.'
     task['control']='text'
     rule={'mode':'authored','kind':'text','partIds':[task['parts'][0]['id']],'accepted':['My name is Emma.'],'feedback':'My name is Emma. — Mening ismim Emma.','notes':'','rubric':None,'listening':False,'strict':False}
    assert rule['mode']=='authored'
    rule.update(binary=True,rubric=None,listening=False)
    new_keys[task['id']]=rule
    sections.append({'id':f"{old['id']}-window-practice{task['number']}",'title':f"Mashq {task['number']}",'items':[task]})
 else:
  intro=old['sections'][0]
  sections.append({'id':old['id']+'-window-intro','title':'Yakuniy imtihon','items':copy.deepcopy(intro['items'])})
  reading=[copy.deepcopy(i) for s in old['sections'] if s['title']=='O‘QISH' for i in s['items'] if i['kind']=='text']
  for n,original in by_number.items():
   if n==13:sections.append({'id':old['id']+'-window-audio','title':'Audioni tinglang','items':[{'kind':'text','id':old['id']+'-audio-help','text':'Audioni ko‘pi bilan ikki marta tinglang. Keyingi to‘rtta savol shu suhbat haqida.'},{'kind':'audio','id':old['id']+'-audio-player'}]})
   task=copy.deepcopy(original);rule=copy.deepcopy(original_keys[old['id']]['tasks'][task['id']]);rule.update(binary=True,rubric=None)
   new_keys[task['id']]=rule
   items=copy.deepcopy(reading) if 9<=n<=12 else []
   # Every repeated context has a distinct DOM ID within its window.
   for item in items:item['id']+=f'-window{n}'
   items.append(task)
   sections.append({'id':f"{old['id']}-window-question{n}",'title':f"Savol {n}",'items':items})
 lesson['sections']=sections;keys[old['id']]['tasks']=new_keys;result.append(lesson)
(ROOT/'src/lib/learning/unit1.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(ROOT/'src/lib/server/learning/unit1-keys.json').write_text(json.dumps(keys,ensure_ascii=False,indent=2)+'\n')
audio_file=ROOT/'src/lib/server/learning/unit1-audio.json';audio=json.loads(audio_file.read_text());audio[VERSION]=copy.deepcopy(audio['2026-10-19.3']);audio_file.write_text(json.dumps(audio,ensure_ascii=False,indent=2)+'\n')
print('Authored five compact lessons × 12 practices and one 20-question unit exam. All grading is binary and automatic.')
