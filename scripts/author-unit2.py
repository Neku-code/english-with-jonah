"""Original beginner curriculum. Re-run to reproduce display, keys and audio.

Side by Side is a pedagogical reference: model dialogues, picture cues,
substitution practice, short readings. No textbook passages or art are copied.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION = '2026-10-21.1'
lessons, keys, audio = [], {}, {}

def choice(prompt, options, correct, note, **extra):
    return dict(control='choice', prompt=prompt, options=options, correct=correct, note=note, **extra)

def text(prompt, answers, note, **extra):
    return dict(control='text', prompt=prompt, answers=answers if isinstance(answers,list) else [answers], note=note, **extra)

def order(sentence, note):
    return dict(control='order', prompt='So‘zlarni tartibga qo‘yib, gap tuzing.', answers=[sentence], note=note)

def add(n, title, vocabulary, blocks, exercises, turns, models=None):
    lid=f'u2-l{n}'
    assert len(exercises)==(20 if n==6 else 12)
    key={'tasks':{},'vocabulary':{}}
    vocab=[]
    for i,(english,translations) in enumerate(vocabulary):
        translations=translations.split('|')
        vid=f'{lid}-v{i+1}'
        vocab.append(dict(id=vid,english=english,uzbek=translations[0]))
        key['vocabulary'][vid]=translations
    images=[]
    if models:
        base=f'/lessons/unit2/{VERSION}/routines-'
        images=[dict(id=f'{lid}-routines',url=base+'960.webp',width=960,height=960,
            variants=[dict(url=base+str(w)+'.webp',width=w,height=w) for w in [640,960,1280]],
            original=base+'1280.webp',alt='To‘rtta kundalik mashg‘ulot: nonushta, kutubxonada kitob o‘qish, velosiped haydash va basketbol o‘ynash.',
            models=models,panels=[])]
    tasks=[]
    for i,e in enumerate(exercises):
        tid=f'{lid}-q{i+1}'; pid=tid+'-answer'
        task=dict(kind='task',id=tid,number=i+1,prompt=e['prompt'],control=e['control'],
            parts=[dict(id=pid,label='Javobingiz')],maxPoints=1,listening=False)
        if e['control']=='choice':
            task['options']=[dict(id=chr(65+j),label=o) for j,o in enumerate(e['options'])]
            accepted=[chr(65+e['correct'])]
            expected=e['options'][e['correct']]
        else:
            accepted=e['answers'];expected=accepted[0]
        if e['control']=='order':
            words=accepted[0].rstrip('.?!').split()
            # Deterministic unsorted token bank; IDs preserve repeated words.
            tokens=[dict(id=tid+f'-t{j}',label=w) for j,w in enumerate(words)]
            task['tokens']=tokens[1::2]+tokens[::2]
        if e.get('picture'):
            task['imageId']=images[0]['id']
        key['tasks'][tid]=dict(mode='authored',kind=e['control'],partIds=[pid],accepted=accepted,
            feedback=expected,notes=e['note'],rubric=None,listening=False,strict=False,binary=True)
        tasks.append(task)
    sections=[]
    for b,(heading,body) in enumerate(blocks):
        sid=f'{lid}-explain-{b+1}'
        items=[dict(kind='text',id=sid+'-text',text=body)]
        if b==0 and turns:items.append(dict(kind='audio',id=lid+'-audio'))
        section=dict(id=sid,title=heading,items=items)
        if b==0 and images:section['imageId']=images[0]['id']
        sections.append(section)
        if n!=6:
            for t in tasks[b*4:b*4+4]:sections.append(dict(id=t['id']+'-window',title=f'Mashq {t["number"]}',items=[t]))
    if n==6:
        sections.extend(dict(id=t['id']+'-window',title=f'Savol {t["number"]}',items=[t]) for t in tasks)
    lessons.append(dict(id=lid,number=f'2.{n}',title=title,version=VERSION,kind='exam' if n==6 else 'practice',flow='windows',automatic=True,sections=sections,images=images,vocabulary=vocab,audioId=lid+'-audio'))
    keys[lid]=key
    audio[lid]=[dict(speaker=s,text=t) for s,t in turns]

v1=[('get up','uyg‘onmoq|o‘rnidan turmoq|turmoq'),('have breakfast','nonushta qilmoq'),('study','o‘qimoq|o‘rganmoq'),('work','ishlamoq'),('live','yashamoq'),('read','o‘qimoq|kitob o‘qimoq'),('play basketball','basketbol o‘ynamoq'),('ride a bike','velosiped haydamoq|minmoq'),('every day','har kuni'),('in the morning','ertalab|tongda'),('library','kutubxona'),('speak','gapirmoq|so‘zlamoq')]
add(1,'Daily routines · Kundalik hayot',v1,[
 ('Har kuni nima qilasiz?', 'Maya: I have breakfast every morning. — Men har kuni ertalab nonushta qilaman.\nBen: I read in the library. — Men kutubxonada kitob o‘qiyman.\nPresent Simple odatlar, takrorlanadigan ishlar va umumiy faktlarni bildiradi. Bu ayni hozir bo‘layotgan ishni ifodalash uchun emas.\nRasmni kuzating. Har bir ish uchun bitta oddiy gap ayting.'),
 ('I / you / we / they + fe’l','I study English. — Men ingliz tilini o‘rganaman.\nYou study English. — Siz ingliz tilini o‘rganasiz.\nWe work. — Biz ishlaymiz. They live in Tashkent. — Ular Toshkentda yashaydilar.\nI, you, we, they bilan fe’lga -s qo‘shilmaydi. I am study emas, I study.'),
 ('Modelni o‘zgartiring','I play basketball every day. → We play basketball every day.\nI read in the library. → They read in the library.\nEvery day — har kuni. In the morning — ertalab.\nTo Be bilan farqi: I am a student — kimman? I study English — nima qilaman?')], [
 choice('I ___ English every day.',['study','studies','am study'],0,'I bilan fe’lning asosiy shakli: study.'),
 choice('Rasmning yuqori o‘ngida qaysi mashg‘ulot bor?',['have breakfast','read in the library','play basketball'],1,'Kutubxonadagi talaba kitob o‘qiyapti. Odat sifatida: I read in the library.',picture=True),
 text('We ___ in Tashkent. (yashamoq)','live','We bilan live ishlatiladi.'),
 order('I have breakfast every morning.','I + have breakfast + every morning.'),
 choice('Qaysi gap to‘g‘ri?',['I am work every day.','I works every day.','I work every day.'],2,'Harakat uchun am qo‘shmang. I work.'),
 text('They ___ basketball. (o‘ynamoq)','play','They bilan play, plays emas.'),
 text('You ___ English. (gapirmoq)','speak','You speak English.'),
 order('We read in the library.','We + read + joy.'),
 choice('Every day nimani bildiradi?',['har kuni','hozir','kecha'],0,'Bu takrorlanadigan ishni bildiradi.'),
 text('Tarjima qiling: Men ingliz tilini o‘rganaman.','I study English.','I study English. Am kerak emas.'),
 text('I work. Gapini We bilan qayta yozing.','We work.','I va we bilan fe’l o‘zgarmaydi.'),
 choice('Qaysi gap odatni bildiradi?',['I am tired.','I read every morning.','I am a student.'],1,'Read every morning — takrorlanadigan ish.')
 ],[('Maya','I have breakfast every morning.'),('Ben','I read in the library.'),('Emma','I ride a bike every day.'),('Friends','We play basketball.')],
 ['Maya: I have breakfast every morning.','Ben: I read in the library.','Emma: I ride a bike every day.','Friends: We play basketball.'])

v2=[('teach','o‘qitmoq|dars bermoq'),('watch','tomosha qilmoq|ko‘rmoq'),('wash','yuvmoq'),('go','bormoq'),('do homework','uy vazifasini bajarmoq|uyga vazifa qilmoq'),('have','ega bo‘lmoq|bor bo‘lmoq'),('cook','ovqat pishirmoq|pishirmoq'),('sister','opa|singil|opa-singil'),('brother','aka|uka|aka-uka'),('teacher','o‘qituvchi|ustoz'),('school','maktab'),('after class','darsdan keyin')]
add(2,'He / she / it · -s va -es',v2,[
 ('Bitta odam haqida','Ben reads in the library. — Ben kutubxonada o‘qiydi.\nEmma rides a bike. — Emma velosiped haydaydi.\nI read. → He reads. We work. → She works.\nHe, she, it yoki bitta odamning ismi bilan tasdiq gapda fe’lga odatda -s qo‘shiladi.'),
 ('Imlo: -s / -es / -ies','Ko‘p fe’llar: read → reads, play → plays.\n-s, -sh, -ch, -x bilan tugaganlar: wash → washes, watch → watches, fix → fixes.\nGo → goes; do → does. Undosh + y: study → studies. Unli + y: play → plays.\nHave alohida: I have a book. → She has a book.'),
 ('Ikki modelni solishtiring','My sister studies English. — Singlim ingliz tilini o‘rganadi.\nMy friends study English. — Do‘stlarim ingliz tilini o‘rganadilar.\nHe goes to school. He does homework after class.\nEga ko‘plikmi yoki birlikmi? Avval egani toping, keyin fe’lni tanlang.')],[
 choice('He ___ in the library.',['read','reads','reading'],1,'He + reads.'),
 text('She ___ English. (study)','studies','Undosh + y → ies: studies.'),
 order('Emma rides a bike.','Emma bitta odam: rides.'),
 choice('They ___ basketball.',['plays','play','is play'],1,'They bilan -s ishlatilmaydi.'),
 text('Ben ___ TV after class. (watch)','watches','-ch bilan tugagan watch → watches.'),
 text('She ___ to school. (go)','goes','Go → goes.'),
 text('My brother ___ a book. (have)','has','He / she / it bilan have → has.'),
 choice('She ___ her hands.',['washs','wash','washes'],2,'-sh bilan tugagan wash → washes.'),
 text('He ___ homework after class. (do)','does','Do → does.'),
 text('She ___ basketball. (play)','plays','Unli + y: play → plays. Plaies emas.'),
 text('I work in a school. Gapini He bilan yozing.','He works in a school.','He bilan works.'),
 choice('Qaysi gap to‘g‘ri?',['My friends studies English.','My friend study English.','My friend studies English.'],2,'My friend — bitta odam; studies.')
 ],[('Maya','My sister studies English.'),('Ben','My friends study English.'),('Emma','He goes to school. He does homework after class.')],
 ['Maya has breakfast.','Ben reads a book.','Emma rides a bike.','The friends play basketball.'])

v3=[('like','yoqtirmoq|yaxshi ko‘rmoq'),('drink','ichmoq'),('eat','yemoq'),('coffee','qahva|kofe'),('tea','choy'),('meat','go‘sht'),('weekend','dam olish kunlari|hafta oxiri'),('on Sundays','yakshanba kunlari|yakshanbalarda'),('drive','haydamoq'),('bus','avtobus'),('listen to music','musiqa tinglamoq|musiqa eshitmoq'),('at night','tunda|kechasi')]
add(3,'Negatives · Don’t va doesn’t',v3,[
 ('Men buni qilmayman','Maya: I drink tea. I do not drink coffee.\nBen: My sister likes tea. She does not like coffee.\nDo not = don’t. Does not = doesn’t. Ikkala shakl ham to‘g‘ri.\nInkor gap biror ish yoki odat mavjud emasligini bildiradi.'),
 ('Don’t / doesn’t + asosiy fe’l','I / you / we / they + don’t + fe’l.\nHe / she / it + doesn’t + fe’l.\nShe likes tea. → She doesn’t like tea.\n-s belgisi does ichida bor, shuning uchun doesn’t likes emas, doesn’t like.'),
 ('Tasdiq va inkor','We work on Mondays. We don’t work on Sundays.\nHe drives a car. He doesn’t drive a bus.\nShe has a bike. → She doesn’t have a bike.\nI am not tired — holat. I don’t work at night — harakat/odat.')],[
 choice('I ___ drink coffee.',['doesn’t','don’t','am not'],1,'I bilan don’t ishlatiladi.'),
 choice('She ___ eat meat.',['don’t','isn’t','doesn’t'],2,'She bilan doesn’t ishlatiladi.'),
 text('He doesn’t ___ a bus. (drive)','drive','Doesn’t dan keyin asosiy fe’l.'),
 order('We do not work on Sundays.','We + do not + work.'),
 choice('Qaysi gap to‘g‘ri?',['She doesn’t likes coffee.','She doesn’t like coffee.','She don’t like coffee.'],1,'Doesn’t like — ikkita -s qo‘ymang.'),
 text('They like coffee. Inkor gap qiling.',["They don't like coffee.",'They do not like coffee.'],'They + don’t + like.'),
 text('Ben works at night. Inkor gap qiling.',["Ben doesn't work at night.",'Ben does not work at night.'],'Ben + doesn’t + work.'),
 text('She doesn’t ___ a bike. (have)','have','Doesn’t have; doesn’t has emas.'),
 choice('We ___ basketball on Sundays.',['don’t play','doesn’t play','don’t plays'],0,'We + don’t + play.'),
 order('He does not drink tea.','He + does not + drink.'),
 text('Tarjima qiling: Men qahva ichmayman.',["I don't drink coffee.",'I do not drink coffee.'],'I don’t drink coffee.'),
 text('Xatoni tuzating: She doesn’t watches TV.', ["She doesn't watch TV.",'She does not watch TV.'],'Doesn’t dan keyin watch ishlatiladi.')
 ],[('Maya','I drink tea. I do not drink coffee.'),('Ben','My sister likes tea. She does not like coffee.'),('Emma','We do not work on Sundays.')])

v4=[('walk','piyoda yurmoq|yurmoq'),('take the bus','avtobusga chiqmoq|avtobusda bormoq'),('near','yaqin|yaqinida'),('far','uzoq|uzoqda'),('need','kerak bo‘lmoq|muhtoj bo‘lmoq'),('help','yordam|yordam bermoq'),('classmate','sinfdosh|guruhdosh'),('together','birga|birgalikda'),('at home','uyda'),('on Mondays','dushanba kunlari|dushanbalarda'),('English','ingliz tili|inglizcha'),('want','xohlamoq|istamoq')]
add(4,'Questions · Do you? Does she?',v4,[
 ('Savol bering, qisqa javob qaytaring','Maya: Do you study English?\nBen: Yes, I do.\nMaya: Does Emma take the bus?\nBen: No, she doesn’t. She rides a bike.\nDo / does savol boshiga o‘tadi.'),
 ('Savol tartibi','Do + I / you / we / they + fe’l?\nDoes + he / she / it + fe’l?\nYou work. → Do you work? She works. → Does she work?\nDoes she works? noto‘g‘ri. Does dan keyin asosiy fe’l.'),
 ('Qisqa javoblar','Do you live near the school? — Yes, I do. / No, I don’t.\nDoes he study at home? — Yes, he does. / No, he doesn’t.\nDo they work together? — Yes, they do. / No, they don’t.\nAre you a student? — Yes, I am. Do you study? — Yes, I do. Savoldagi yordamchi fe’lni tekshiring.')],[
 choice('___ you study English?',['Do','Does','Are'],0,'Study harakati bilan Do you...?'),
 choice('___ Emma ride a bike?',['Do','Is','Does'],2,'Emma bitta odam: Does Emma...?'),
 text('Does he ___ near the school? (live)','live','Does dan keyin live.'),
 order('Do they work together?','Do + they + work + together?'),
 text('Do you like tea? Qisqa tasdiq javob.','Yes, I do.','You haqida so‘ralganda o‘zingiz uchun I bilan javob bering.'),
 text('Does she study at home? Qisqa inkor javob.',["No, she doesn't.",'No, she does not.'],'Does → doesn’t.'),
 choice('Do they take the bus? — Yes, ___.',['they are','they does','they do'],2,'Do savoliga do bilan javob.'),
 text('Does Ben work on Mondays? Qisqa tasdiq javob.','Yes, he does.','Ben → he; does.'),
 text('She likes tea. Savol qiling.','Does she like tea?','Does + she + like tea?'),
 text('They live in Tashkent. Savol qiling.','Do they live in Tashkent?','Do + they + live ...?'),
 choice('Qaysi savol to‘g‘ri?',['Does she have a bike?','Does she has a bike?','Do she have a bike?'],0,'Does + she + have.'),
 order('Does your classmate need help?','Your classmate — bitta odam. Does ishlating.')
 ],[('Maya','Do you study English?'),('Ben','Yes, I do.'),('Maya','Does Emma take the bus?'),('Ben','No, she does not. She rides a bike.')])

v5=[('where','qayerda|qayerga|qayer'),('when','qachon'),('what','nima|qanday'),('how often','qanchalik tez-tez|qanchalik tez tez|necha marta'),('always','har doim|doimo'),('usually','odatda'),('sometimes','ba’zan|bazida|ba’zida'),('never','hech qachon'),('once a week','haftasiga bir marta'),('twice a week','haftasiga ikki marta'),('after breakfast','nonushtadan keyin'),('before class','darsdan oldin')]
add(5,'Wh-questions · Odatlar haqida',v5,[
 ('Qayerda? Qachon? Nima?','Maya: Where do you study?\nBen: I study in the library.\nMaya: When does Emma ride her bike?\nBen: She rides her bike before class.\nSavol so‘zi + do / does + ega + asosiy fe’l?'),
 ('How often? — Qanchalik tez-tez?','How often do you play basketball? — I play twice a week.\nAlways — har doim; usually — odatda; sometimes — ba’zan; never — hech qachon.\nI usually read after breakfast. She never drinks coffee.\nBu ravishlar odatda asosiy fe’ldan oldin: usually read. To Be dan keyin: She is always busy. Never o‘zi inkor: don’t never demang.'),
 ('Emma haqida o‘qing','Emma lives in Boston. She studies English. She usually rides her bike before class.\nShe plays basketball twice a week. She never drinks coffee.\nWhere does Emma live? — In Boston.\nHow often does she play basketball? — Twice a week. What does she study? — English.\nOxirgi to‘rtta mashqda shu matndan foydalaning.')],[
 choice('___ do you study? — In the library.',['When','Where','How often'],1,'Joy haqida Where bilan so‘raladi.'),
 text('When ___ she ride her bike?','does','She bilan does; ride o‘zgarmaydi.'),
 order('What do they study?','What + do + they + study?'),
 choice('How often do you play basketball?',['In Boston.','English.','Twice a week.'],2,'How often — takrorlanish soni yoki tezligi.'),
 text('Tarjima qiling: Men odatda ertalab o‘qiyman.','I usually read in the morning.','Usually asosiy fe’ldan oldin keladi.'),
 choice('Qaysi gap to‘g‘ri?',['She never drinks coffee.','She doesn’t never drink coffee.','She never drink coffee.'],0,'Never o‘zi inkor ma’nosida. She bilan drinks.'),
 order('How often does he read?','How often + does + he + read?'),
 choice('To Be bilan to‘g‘ri tartibni tanlang.',['She always is busy.','She is always busy.','She does always busy.'],1,'Bu darsdagi odatiy tartib: is always busy.'),
 choice('Emma lives in Boston. Where does Emma live?',['In Tashkent.','In Boston.','In London.'],1,'Matndagi joy — Boston.'),
 text('Emma studies English. What does she study? Bir so‘z yozing.','English','U ingliz tilini o‘rganadi.'),
 choice('Emma plays basketball twice a week. How often?',['Every day.','Once a week.','Twice a week.'],2,'Haftasiga ikki marta — twice a week.'),
 text('Emma never drinks coffee. Does Emma drink coffee? Qisqa inkor javob.',["No, she doesn't.",'No, she does not.'],'Does savoliga doesn’t bilan inkor javob bering.')
 ],[('Maya','Where do you study?'),('Ben','I study in the library.'),('Maya','How often do you play basketball?'),('Ben','I play twice a week.')])

add(6,'Present Simple · Yakuniy imtihon',[],[
 ('Bilimingizni sinab ko‘ring','20 ta savol · 20 ball. Kamida 90% — 18 ta to‘g‘ri javob — bo‘limni o‘zlashtirish uchun kerak.\nBu imtihonda audio shart emas. Javoblar imtihon topshirilgandan keyin ko‘rinadi.\nOxirgi savollarda qisqa matn bo‘ladi. Gap yozishda savol va inkor tartibiga e’tibor bering.')],[
 choice('We ___ English every day.',['study','studies','are study'],0,'We study.'),
 text('He ___ in Tashkent. (live)','lives','He lives.'),
 text('She ___ English. (study)','studies','Study → studies.'),
 choice('My sister ___ TV.',['watch','watchs','watches'],2,'Watch → watches.'),
 text('Ben ___ a bike. (have)','has','Have → has.'),
 choice('They ___ work on Sundays.',['doesn’t','don’t','aren’t'],1,'They don’t work.'),
 text('She doesn’t ___ coffee. (drink)','drink','Doesn’t + asosiy fe’l.'),
 text('He likes tea. Inkor gap qiling.',["He doesn't like tea.",'He does not like tea.'],'Doesn’t like.'),
 order('We do not play basketball.','We do not + play.'),
 choice('___ she work in a school?',['Do','Is','Does'],2,'Does she work?'),
 text('Do they study at home? Qisqa tasdiq javob.','Yes, they do.','Yes, they do.'),
 text('Does he live in Boston? Qisqa inkor javob.',["No, he doesn't.",'No, he does not.'],'No, he doesn’t.'),
 text('She goes to school. Savol qiling.','Does she go to school?','Does she go; goes emas.'),
 order('Where do you work?','Where + do + you + work?'),
 choice('___ does she play? — Twice a week.',['Where','How often','What'],1,'How often — qanchalik tez-tez?'),
 choice('Qaysi gap odatiy tartibda yozilgan?',['I read usually at home.','I am usually read at home.','I usually read at home.'],2,'Usually asosiy fe’ldan oldin.'),
 text('Tarjima qiling: U (qiz) hech qachon qahva ichmaydi.','She never drinks coffee.','She + never + drinks.'),
 choice('Ben lives in Boston. He reads every morning. Where does Ben live?',['In Boston.','In Tashkent.','In a school.'],0,'Matn: Ben lives in Boston.'),
 text('Ben reads every morning. When does he read? Inglizcha ikki so‘z yozing.','Every morning.','Har kuni ertalab — every morning.'),
 text('Ben plays basketball twice a week. Does Ben play basketball? Qisqa tasdiq javob.','Yes, he does.','Ben → he. Does savoliga does javobi.')
 ],[])

for relative,data in [('src/lib/learning/unit2.json',lessons),('src/lib/server/learning/unit2-keys.json',keys),('src/lib/server/learning/unit2-audio.json',{VERSION:audio})]:
    (ROOT/relative).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('Unit 2: five lessons, 60 vocabulary entries, 60 practices, 20 exam questions.')
