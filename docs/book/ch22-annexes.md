# الفصل 22: الملاحق

## 🎯 ماذا ستجد في هذه الملاحق

- **(أ) قاموس المصطلحات**: أكثر من 90 مصطلحاً بالعربية والفرنسية والإنجليزية مع شرح قصير.
- **(ب) دليل روابط الأدوات**: المواقع الرسمية لأهم الأدوات المذكورة في الكتاب.
- **(ج) ورقة مرجعية** (**Aide-mémoire**): صيغ البرومبت للنص والصورة والفيديو والموسيقى والسكريبت.
- **(د) قائمة تحقق** (**Check-list**) قبل نشر أي فيديو.

> 💡 **نصيحة:** اطبع الملحقين (ج) و(د) أو احفظهما على هاتفك. ستعود إليهما في كل مشروع.

---

## (أ) قاموس المصطلحات

### الذكاء الاصطناعي والنماذج

| عربي | Français | English | شرح قصير |
|---|---|---|---|
| الذكاء الاصطناعي | Intelligence artificielle (IA) | Artificial Intelligence (AI) | أنظمة تؤدي مهاماً تتطلب عادة ذكاءً بشرياً كالفهم والكتابة والرؤية |
| التعلّم الآلي | Apprentissage automatique | Machine Learning | تعلّم الآلة من البيانات بدل البرمجة الصريحة لكل قاعدة |
| التعلّم العميق | Apprentissage profond | Deep Learning | تعلّم آلي يعتمد على شبكات عصبية متعددة الطبقات |
| الشبكة العصبية | Réseau de neurones | Neural Network | نموذج رياضي مستوحى من الدماغ، مكوّن من طبقات مترابطة |
| النموذج اللغوي الكبير | Grand modèle de langage | Large Language Model (LLM) | نموذج تدرّب على كمّ هائل من النصوص ليتنبأ بالكلمة التالية |
| الذكاء الاصطناعي التوليدي | IA générative | Generative AI | ذكاء اصطناعي ينتج محتوى جديداً: نصاً، صورة، صوتاً، فيديو |
| النموذج | Modèle | Model | البرنامج المدرَّب الذي يولّد الإجابات |
| بيانات التدريب | Données d'entraînement | Training data | المحتوى الذي تعلّم منه النموذج |
| التدريب | Entraînement | Training | مرحلة تعلّم النموذج من البيانات |
| الضبط الدقيق | Ajustement fin | Fine-tuning | تدريب إضافي لنموذج على بيانات خاصة لمهمة محددة |
| الوحدة النصية (التوكن) | Jeton | Token | قطعة من الكلمة يعالجها النموذج، وبها تُحسب الحدود والتكاليف |
| نافذة السياق | Fenêtre de contexte | Context window | كمية النص التي «يتذكرها» النموذج في محادثة واحدة |
| الهلوسة | Hallucination | Hallucination | إجابة خاطئة يقدّمها النموذج بثقة كأنها حقيقة |
| التحيّز | Biais | Bias | ميل غير عادل في النتائج ناتج عن البيانات أو التصميم |
| متعدد الوسائط | Multimodal | Multimodal | نموذج يفهم أو ينتج أكثر من نوع: نص وصورة وصوت |
| الوكيل الذكي | Agent IA | AI Agent | نظام ينفّذ مهاماً متعددة الخطوات ويستعمل أدوات بنفسه |
| الدردشة الآلية | Agent conversationnel | Chatbot | برنامج يحاورك بلغة طبيعية |
| معالجة اللغة الطبيعية | Traitement automatique du langage (TAL) | Natural Language Processing (NLP) | فرع يهتم بفهم الآلة للغة البشرية |
| الرؤية الحاسوبية | Vision par ordinateur | Computer Vision | فرع يهتم بفهم الآلة للصور والفيديو |
| واجهة البرمجة | Interface de programmation (API) | API | طريقة تتواصل بها البرامج مع النموذج آلياً |
| الاستدلال | Raisonnement | Reasoning | قدرة النموذج على حل المسائل خطوة بخطوة |
| التزييف العميق | Hypertrucage | Deepfake | فيديو أو صوت مزيف يحاكي شخصاً حقيقياً |
| العلامة المائية | Filigrane | Watermark | علامة ظاهرة أو خفية تدل على مصدر المحتوى |
| وسم المحتوى المولَّد | Étiquetage du contenu IA | AI content labeling | الإعلان بوضوح أن المحتوى صُنع بالذكاء الاصطناعي |
| حقوق النشر | Droit d'auteur | Copyright | الحماية القانونية للأعمال الإبداعية |
| الموافقة | Consentement | Consent | إذن صريح من الشخص قبل استعمال وجهه أو صوته |
| البيانات الشخصية | Données personnelles | Personal data | كل معلومة تحدّد هوية شخص |
| شروط الاستعمال | Conditions d'utilisation | Terms of use | القواعد القانونية لاستعمال الأداة، ومنها الاستعمال التجاري |

### البرومبت وهندسته

| عربي | Français | English | شرح قصير |
|---|---|---|---|
| البرومبت / الأمر النصي | Prompt / Requête | Prompt | التعليمات التي تكتبها للنموذج |
| هندسة البرومبت | Ingénierie de prompt | Prompt engineering | فن صياغة الأوامر للحصول على أفضل نتيجة |
| الدور | Rôle | Role | الشخصية أو الخبرة التي تطلب من النموذج تقمّصها |
| المهمة | Tâche | Task | ما تريد من النموذج فعله بالضبط |
| السياق | Contexte | Context | المعلومات الخلفية التي يحتاجها النموذج |
| الصيغة / الشكل | Format | Format | شكل الإجابة: جدول، قائمة، فقرة... |
| القيود | Contraintes | Constraints | الحدود: الطول، النبرة، ما يجب تجنّبه |
| الأمثلة | Exemples | Examples | نماذج توضّح للنموذج ما تتوقعه |
| بدون أمثلة | Zéro exemple | Zero-shot | طلب مباشر دون إعطاء أي مثال |
| أمثلة قليلة | Quelques exemples | Few-shot | إعطاء مثال أو أكثر قبل الطلب |
| التفكير خطوة بخطوة | Raisonnement étape par étape | Chain of thought | طلب حل المسألة على مراحل واضحة |
| تسلسل البرومبتات | Chaînage de prompts | Prompt chaining | تقسيم مهمة كبيرة إلى برومبتات متتالية |
| التعليمات النظامية | Instructions système | System prompt | تعليمات ثابتة تحدد سلوك المساعد في كل المحادثة |
| البرومبت السلبي | Prompt négatif | Negative prompt | ما لا تريده أن يظهر في الصورة أو الفيديو |
| النبرة | Ton | Tone | أسلوب الكلام: رسمي، ودود، فكاهي... |
| التكرار والتحسين | Itération | Iteration | تعديل البرومبت تدريجياً حتى تتحسن النتيجة |
| القالب | Modèle de prompt | Prompt template | برومبت جاهز بفراغات تملؤها |
| المتغيّر | Variable | Variable | خانة في القالب مثل [المنتج] تستبدلها بقيمتك |
| درجة الإبداع | Température | Temperature | إعداد يتحكم في عشوائية الإجابة وتنوّعها |

### الصورة والتصميم

| عربي | Français | English | شرح قصير |
|---|---|---|---|
| توليد الصور | Génération d'images | Image generation | إنشاء صورة من وصف نصي |
| نص إلى صورة | Texte vers image | Text-to-image | تحويل البرومبت النصي إلى صورة |
| صورة إلى صورة | Image vers image | Image-to-image | توليد صورة جديدة انطلاقاً من صورة مرجعية |
| نموذج الانتشار | Modèle de diffusion | Diffusion model | تقنية تولّد الصورة بإزالة «الضجيج» تدريجياً |
| نسبة الأبعاد | Format d'image / Ratio | Aspect ratio | العلاقة بين العرض والارتفاع مثل 16:9 و9:16 |
| الدقة | Résolution | Resolution | عدد البكسلات، وكلما زاد كانت الصورة أوضح |
| التكبير الذكي | Agrandissement / Upscale | Upscaling | رفع دقة الصورة دون فقدان كبير للجودة |
| الأسلوب | Style | Style | الطابع الفني: واقعي، كرتوني، ألوان مائية... |
| الإضاءة | Éclairage | Lighting | مصدر الضوء ونوعه واتجاهه |
| التكوين | Composition | Composition | ترتيب العناصر داخل الإطار |
| إزالة الخلفية | Détourage | Background removal | فصل الموضوع عن خلفيته |
| الملء التوليدي | Remplissage génératif | Generative fill / Inpainting | تعديل جزء محدد من الصورة بالذكاء الاصطناعي |
| التوسيع | Extension d'image | Outpainting | توليد ما خارج حدود الصورة الأصلية |
| البذرة | Graine | Seed | رقم يسمح بإعادة إنتاج نتيجة مشابهة |
| الصورة المرجعية | Image de référence | Reference image | صورة تُعطى للأداة لتوجيه الأسلوب أو الشخصية |
| ثبات الشخصية | Cohérence du personnage | Character consistency | ظهور الشخصية نفسها بالملامح نفسها في عدة صور |
| لوحة الألوان | Palette de couleurs | Color palette | مجموعة الألوان المعتمدة لمشروع أو علامة |
| الهوية البصرية | Identité visuelle | Visual identity / Branding | الشعار والألوان والخطوط التي تميّز علامة |

### الفيديو والتصوير

| عربي | Français | English | شرح قصير |
|---|---|---|---|
| توليد الفيديو | Génération vidéo | Video generation | إنشاء مقطع فيديو من نص أو صورة |
| نص إلى فيديو | Texte vers vidéo | Text-to-video | فيديو من وصف نصي فقط |
| صورة إلى فيديو | Image vers vidéo | Image-to-video | تحريك صورة ثابتة |
| السكريبت | Script / Scénario | Script | النص الكامل للفيديو: كلام ومشاهد |
| الستوريبورد | Storyboard / Scénarimage | Storyboard | تسلسل مرسوم للّقطات قبل الإنتاج |
| الخطّاف | Accroche | Hook | أول ثوانٍ تشدّ انتباه المشاهد |
| الدعوة لاتخاذ إجراء | Appel à l'action | Call to action (CTA) | ما تطلبه من المشاهد: اشترِ، اشترك، زُرنا |
| اللقطة | Plan | Shot | جزء متواصل من التصوير دون قطع |
| المشهد | Scène | Scene | مجموعة لقطات في مكان وزمن واحد |
| لقطة عامة | Plan large | Wide shot | تُظهر المكان كاملاً |
| لقطة متوسطة | Plan moyen | Medium shot | تُظهر الشخص من الخصر تقريباً |
| لقطة قريبة | Gros plan | Close-up | تُركّز على الوجه أو تفصيل |
| حركة الكاميرا | Mouvement de caméra | Camera movement | الطريقة التي تتحرك بها الكاميرا في اللقطة |
| تقدّم/تراجع الكاميرا | Travelling avant / arrière | Dolly in / out | اقتراب الكاميرا من الموضوع أو ابتعادها |
| الحركة الأفقية | Panoramique | Pan | دوران الكاميرا يميناً أو يساراً في مكانها |
| الحركة العمودية | Panoramique vertical | Tilt | دوران الكاميرا للأعلى أو للأسفل |
| التقريب البصري | Zoom | Zoom | تكبير الصورة بالعدسة دون تحريك الكاميرا |
| لقطة ثابتة | Plan fixe | Static shot | الكاميرا لا تتحرك |
| لقطة جوية | Plan aérien / Vue de drone | Aerial / Drone shot | تصوير من الأعلى كأنه بطائرة مسيّرة |
| الدوران حول الموضوع | Travelling circulaire | Orbit / Arc shot | تدور الكاميرا حول الموضوع |
| الحركة البطيئة | Ralenti | Slow motion | إبطاء الحركة لإبراز اللحظة |
| الأفاتار / المتحدث الرقمي | Avatar / Présentateur virtuel | Avatar / Digital presenter | شخصية رقمية تتكلم بنص تكتبه |
| مزامنة الشفاه | Synchronisation labiale | Lip sync | تطابق حركة الشفاه مع الصوت |
| عدد الصور في الثانية | Images par seconde | Frames per second (FPS) | سلاسة الحركة، مثل 24 أو 30 |

### الصوت والموسيقى

| عربي | Français | English | شرح قصير |
|---|---|---|---|
| التعليق الصوتي | Voix off | Voice-over | صوت راوٍ لا يظهر في الصورة |
| نص إلى كلام | Synthèse vocale | Text-to-speech (TTS) | تحويل نص مكتوب إلى صوت |
| استنساخ الصوت | Clonage vocal | Voice cloning | محاكاة صوت شخص، ولا يجوز إلا بموافقته |
| تحويل الكلام إلى نص | Transcription | Speech-to-text | كتابة ما يُقال في التسجيل آلياً |
| الدبلجة | Doublage | Dubbing | استبدال الصوت الأصلي بلغة أخرى |
| موسيقى الخلفية | Musique de fond | Background music | موسيقى هادئة تحت الكلام |
| المؤثرات الصوتية | Effets sonores / Bruitages | Sound effects (SFX) | أصوات قصيرة: باب، خطوات، نقرة |
| خفض الموسيقى تحت الكلام | Atténuation automatique | Ducking | خفض صوت الموسيقى آلياً عندما يتكلم الراوي |
| إزالة الضجيج | Réduction de bruit | Noise reduction | تنظيف التسجيل من الأصوات المزعجة |
| مستوى الصوت | Niveau sonore | Audio level / Volume | قوة الصوت، وتُقاس عادة بالديسيبل (dB) |
| الإيقاع | Tempo | Tempo / BPM | سرعة الموسيقى بعدد النبضات في الدقيقة |
| كلمات الأغنية | Paroles | Lyrics | النص المغنّى |
| مقطع موسيقي بدون كلام | Instrumental | Instrumental | موسيقى بلا غناء |
| موسيقى بدون حقوق | Musique libre de droits | Royalty-free music | موسيقى يُسمح باستعمالها وفق ترخيص محدد |

### المونتاج والنشر

| عربي | Français | English | شرح قصير |
|---|---|---|---|
| المونتاج | Montage | Video editing | تركيب اللقطات والصوت في فيديو نهائي |
| الخط الزمني | Timeline / Ligne de temps | Timeline | المساحة التي ترتّب فيها المقاطع والصوت |
| القصّ | Coupe | Cut | الانتقال المباشر من لقطة إلى أخرى |
| الانتقال | Transition | Transition | مؤثر بين لقطتين: تلاشي، انزلاق... |
| الترجمة النصية | Sous-titres | Subtitles / Captions | النص المكتوب على الشاشة لما يُقال |
| تصحيح الألوان | Étalonnage | Color grading | ضبط الألوان والمزاج البصري للفيديو |
| التصدير | Exportation | Export | حفظ الفيديو النهائي كملف |
| القالب الجاهز | Modèle | Template | تصميم أو مونتاج جاهز تعدّل محتواه |
| الصورة المصغّرة | Miniature | Thumbnail | الصورة التي تظهر قبل تشغيل الفيديو |
| الفيديو القصير العمودي | Vidéo courte verticale | Short / Reel | فيديو 9:16 لتيك توك وإنستغرام ويوتيوب Shorts |
| ملخص الطلب | Brief / Cahier des charges | Brief | وثيقة تحدد الهدف والجمهور والمطلوب |
| سلسلة العمل | Flux de travail | Workflow | تتابع الخطوات والأدوات لإنجاز مشروع |
| الأتمتة | Automatisation | Automation | جعل مهمة متكررة تتم آلياً |
| بدون برمجة | Sans code | No-code | بناء تطبيقات ومواقع دون كتابة كود |
| ملف الأعمال | Portfolio | Portfolio | مجموعة أعمالك المعروضة للزبائن |
| العمل الحر | Travail indépendant / Freelance | Freelancing | العمل لحساب زبائن متعددين دون عقد دائم |

---

## (ب) دليل روابط الأدوات

> ⚠️ **تحذير:** اكتب الرابط بنفسك أو استعمل هذه القائمة، ولا تضغط على روابط إعلانات تقلّد أسماء الأدوات. توجد مواقع مزيفة كثيرة تسرق الحسابات وبيانات الدفع. الأسعار والحدود المجانية تتغير، فراجع دائماً الموقع الرسمي.

### المساعدات النصية والبحث

| الأداة | الرابط الرسمي | الاستعمال الرئيسي | الفصل |
|---|---|---|---|
| ChatGPT | chatgpt.com | مساعد نصي عام، صور، صوت | 7 |
| Claude | claude.ai | كتابة، تحليل نصوص ووثائق طويلة | 7 |
| Gemini | gemini.google.com | مساعد Google، مرتبط بخدماتها | 7 |
| Microsoft Copilot | copilot.microsoft.com | مساعد Microsoft | 7 |
| Perplexity | perplexity.ai | بحث بإجابات مع مصادر | 7 |
| NotebookLM | notebooklm.google.com | تلخيص ودراسة وثائقك الخاصة | 11 |
| DeepL | deepl.com | ترجمة | 7 |

### الصور والتصميم

| الأداة | الرابط الرسمي | الاستعمال الرئيسي | الفصل |
|---|---|---|---|
| Midjourney | midjourney.com | صور فنية عالية الجودة | 8 |
| Ideogram | ideogram.ai | صور تحتوي نصوصاً مكتوبة | 8 |
| Leonardo | leonardo.ai | توليد صور بإعدادات متعددة | 8 |
| Adobe Firefly | firefly.adobe.com | توليد وتعديل الصور | 8، 9 |
| Canva | canva.com | تصميم منشورات وقوالب | 9 |
| remove.bg | remove.bg | إزالة الخلفية | 9 |

### الصوت والموسيقى

| الأداة | الرابط الرسمي | الاستعمال الرئيسي | الفصل |
|---|---|---|---|
| ElevenLabs | elevenlabs.io | تعليق صوتي، دبلجة، مؤثرات | 10، 17 |
| Suno | suno.com | توليد أغانٍ وموسيقى | 10 |
| Udio | udio.com | توليد موسيقى | 10 |

### الفيديو والأفاتار والمونتاج

| الأداة | الرابط الرسمي | الاستعمال الرئيسي | الفصل |
|---|---|---|---|
| Runway | runwayml.com | توليد وتعديل الفيديو | 15 |
| Kling | klingai.com | توليد الفيديو من نص أو صورة | 15 |
| Luma | lumalabs.ai | توليد الفيديو | 15 |
| Pika | pika.art | فيديوهات قصيرة ومؤثرات | 15 |
| HeyGen | heygen.com | أفاتار ومتحدث رقمي، ترجمة فيديو | 16 |
| Synthesia | synthesia.io | فيديوهات تدريبية بالأفاتار | 16 |
| CapCut | capcut.com | مونتاج على الهاتف والحاسوب | 18 |
| Descript | descript.com | مونتاج بتعديل النص | 18 |

### الإنتاجية والأتمتة وبدون برمجة

| الأداة | الرابط الرسمي | الاستعمال الرئيسي | الفصل |
|---|---|---|---|
| Notion | notion.com | تنظيم الملاحظات والمشاريع | 11 |
| Zapier | zapier.com | أتمتة بين التطبيقات | 11 |
| Make | make.com | أتمتة بسيناريوهات مرئية | 11 |
| n8n | n8n.io | أتمتة مرنة، قابلة للاستضافة الذاتية | 11 |
| Gamma | gamma.app | عروض تقديمية وصفحات بالذكاء الاصطناعي | 11، 12 |
| Framer | framer.com | مواقع بدون برمجة | 12 |
| Lovable | lovable.dev | بناء تطبيقات بالوصف النصي | 12 |

### منصات العمل الحر

| المنصة | الرابط الرسمي | الفصل |
|---|---|---|
| Fiverr | fiverr.com | 20 |
| Upwork | upwork.com | 20 |
| خمسات | khamsat.com | 20 |
| مستقل | mostaql.com | 20 |

---

## (ج) ورقة مرجعية: صيغ البرومبت (Aide-mémoire)

### 1. صيغة النص (Texte)

**الصيغة:** الدور + المهمة + السياق + الصيغة + القيود + الأمثلة

```
Agis comme [rôle / expert].
Tâche : [ce que tu veux exactement].
Contexte : [qui, pour qui, pourquoi, informations utiles].
Format : [liste / tableau / paragraphe / nombre de mots].
Contraintes : [ton, longueur, langue, ce qu'il faut éviter].
Exemple : [un exemple du résultat attendu].
```

**أفعال مفيدة:** Rédige · Résume · Reformule · Traduis · Compare · Classe · Explique · Corrige · Propose · Transforme

**جمل التحسين:** «Plus court» · «Plus simple, pour un débutant» · «Donne 3 variantes» · «Pose-moi d'abord des questions» · «Vérifie tes erreurs»

### 2. صيغة الصورة (Image)

**الصيغة:** الموضوع + التفاصيل + المكان + الأسلوب + الإضاءة + الزاوية/اللقطة + الألوان/المزاج + المعاملات

```
[Sujet], [détails : action, vêtements, matières], [lieu / décor], style [photo réaliste / illustration / 3D], éclairage [doux / lumière dorée / studio], [gros plan / plan large / vue de dessus], ambiance [chaleureuse / minimaliste], couleurs [palette] --ar 4:5
```

🇬🇧 النسخة الإنجليزية (نتائج أدق):

```
[Subject], [details: action, clothing, materials], [location / setting], [realistic photo / illustration / 3D] style, [soft / golden hour / studio] lighting, [close-up / wide shot / top view], [warm / minimalist] mood, [palette] colors --ar 4:5
```

**مقاسات شائعة:** `--ar 1:1` منشور مربع · `--ar 4:5` منشور إنستغرام · `--ar 9:16` قصة وريلز · `--ar 16:9` يوتيوب.

### 3. صيغة الفيديو (Vidéo)

**الصيغة:** نوع اللقطة + الموضوع + الحدث + المكان + حركة الكاميرا + الإضاءة + الأسلوب + المدة

```
[Gros plan / Plan large] de [sujet] qui [action], dans [lieu]. Mouvement de caméra : [travelling avant lent / panoramique gauche-droite / plan fixe / travelling circulaire]. Éclairage [naturel / néon / coucher de soleil]. Style [cinématographique / publicitaire / documentaire]. Durée : [5 s].
```

🇬🇧 النسخة الإنجليزية (نتائج أدق):

```
[Close-up / Wide shot] of [subject] [action], in [location]. Camera movement: [slow dolly in / pan left to right / static shot / orbit]. [Natural / neon / sunset] lighting. [Cinematic / commercial / documentary] style. Duration: [5 s].
```

> 💡 **نصيحة:** حركة كاميرا **واحدة** لكل لقطة. والحدث الواحد البسيط ينجح أكثر من سلسلة أحداث في لقطة واحدة.

### 4. صيغة الموسيقى (Musique)

**الصيغة:** النوع + المزاج + الآلات + الإيقاع + الصوت/بدون صوت + الاستعمال

```
Musique [genre : lo-fi / pop / gnawa moderne / orchestrale], ambiance [joyeuse / calme / épique], instruments [oud, darbouka, piano...], tempo [lent / moyen / rapide], [instrumental / voix féminine en arabe], pour [publicité de 30 secondes / fond de vlog].
```

🇬🇧 النسخة الإنجليزية (نتائج أدق):

```
[Lo-fi / pop / modern gnawa / orchestral] music, [joyful / calm / epic] mood, [oud, darbuka, piano...], [slow / mid / fast] tempo, [instrumental / female vocals in Arabic], for [a 30-second ad / vlog background].
```

### 5. صيغة السكريبت (Script)

**الصيغة:** الهدف + الجمهور + المدة + المنصة + البنية (خطّاف ← مشكلة ← حل ← دعوة) + النبرة + صيغة الجدول

```
Agis comme un scénariste de vidéos courtes.
Écris le script d'une vidéo de [durée] pour [plateforme : TikTok / YouTube / Instagram].
Objectif : [vendre / expliquer / divertir]. Public : [description].
Structure : Accroche (0-3 s) → Problème → Solution → Preuve → Appel à l'action.
Ton : [dynamique / chaleureux / sérieux]. Langue : [arabe dialectal / arabe standard / français].
Format : tableau Temps | Visuel | Voix off | Texte à l'écran | Son.
```

---

## (د) قائمة تحقق قبل نشر أي فيديو

اطبعها وضع علامة ✅ أمام كل بند. **إذا كان بند واحد من قسم «الأخلاقيات والقانون» غير محقق، لا تنشر.**

### المحتوى والرسالة

- [ ] الخطّاف يشدّ الانتباه في أول 3 ثوانٍ.
- [ ] الرسالة الرئيسية واحدة وواضحة.
- [ ] الدعوة لاتخاذ إجراء (**Appel à l'action**) موجودة وواضحة.
- [ ] كل المعلومات صحيحة: الأسماء، الأسعار، العناوين، أرقام الهاتف، التواريخ.
- [ ] النصوص العربية داخل الصور والفيديو مقروءة وبدون أحرف مشوّهة أو أخطاء إملائية.

### الصورة

- [ ] المقاس مناسب للمنصة (9:16 للريلز وتيك توك، 16:9 ليوتيوب).
- [ ] لا توجد تشوهات واضحة: أيدٍ بأصابع زائدة، وجوه مشوّهة، أشياء تذوب أو تختفي.
- [ ] الأسلوب والألوان منسجمة بين كل اللقطات.
- [ ] النصوص على الشاشة لا تغطيها أزرار المنصة (المنطقة الآمنة **Zone de sécurité**).

### الصوت

- [ ] التعليق الصوتي واضح ومسموع فوق الموسيقى.
- [ ] لا توجد قفزات مفاجئة في مستوى الصوت.
- [ ] النطق صحيح للأسماء والكلمات المحلية.
- [ ] الترجمة النصية (**Sous-titres**) موجودة ومصحّحة ومتزامنة.

### الأخلاقيات والقانون

- [ ] لديّ **موافقة** كل شخص يظهر وجهه أو يُسمع صوته (حقيقياً كان أو مستنسخاً).
- [ ] لا يُظهر الفيديو شخصاً حقيقياً يقول أو يفعل شيئاً لم يقله أو يفعله.
- [ ] الموسيقى والصور والمقاطع **مسموح باستعمالها** وفق شروط الأدوات، خصوصاً للاستعمال التجاري.
- [ ] لا شعارات ولا علامات تجارية لغيري دون إذن.
- [ ] المنتج يظهر **كما هو في الحقيقة**، دون تضليل للمستهلك.
- [ ] المحتوى الواقعي المولَّد بالذكاء الاصطناعي **موسوم** وفق قواعد المنصة.
- [ ] لا معلومات شخصية أو حساسة ظاهرة (أرقام، عناوين، وثائق).

### النشر

- [ ] العنوان والوصف والكلمات المفتاحية (**Hashtags**) جاهزة.
- [ ] الصورة المصغّرة (**Miniature**) جذابة وصادقة.
- [ ] شاهدتُ الفيديو كاملاً مرة أخيرة على **الهاتف**، بالصوت وبدونه.
- [ ] احتفظتُ بنسخة من المشروع والبرومبتات المستعملة.

---

## 📝 ملخص الفصل

- القاموس يجمع المصطلحات بالعربية والفرنسية والإنجليزية في ستة مجالات: الذكاء الاصطناعي، البرومبت، الصورة، الفيديو، الصوت، المونتاج والنشر.
- استعمل الروابط الرسمية فقط، وراجع الأسعار والشروط على الموقع الرسمي دائماً.
- لكل نوع محتوى صيغة برومبت ثابتة: النص، الصورة، الفيديو، الموسيقى، السكريبت.
- قائمة التحقق قبل النشر تحميك من الأخطاء التقنية والمشاكل الأخلاقية والقانونية.

## 🚫 أخطاء شائعة

1. **الدخول إلى الأدوات من روابط إعلانات** بدل كتابة العنوان الرسمي.
2. **كتابة برومبت فيديو بعدة حركات كاميرا** في لقطة واحدة.
3. **نسيان النسخة الإنجليزية** لبرومبتات الصور والفيديو عندما تكون النتيجة ضعيفة.
4. **تخطّي قائمة التحقق** «لأن الفيديو قصير».
5. **الخلط بين «Zoom» و«Travelling avant»**: الأول عدسة، والثاني حركة الكاميرا نفسها.

## 🛠️ تمرين تطبيقي

1. اختر 10 مصطلحات من القاموس لم تكن تعرفها، واكتب لكل منها مثالاً من مشروعك.
2. أضف المواقع الرسمية للأدوات التي تستعملها إلى «المفضلة» في متصفحك.
3. املأ صيغ الورقة المرجعية الخمس بمشروع واحد (مثلاً: إطلاق قهوة جديدة في مقهى الحي): نص منشور، صورة، لقطة فيديو، موسيقى خلفية، وسكريبت.
4. طبّق قائمة التحقق على آخر فيديو نشرته، وسجّل البنود التي نسيتها.

## ❓ اختبر نفسك

1. ما الفرق بين **Zoom** و**Travelling avant**؟
2. ما معنى **Hallucination** في سياق النماذج اللغوية؟
3. ما العناصر الأساسية لصيغة برومبت الفيديو؟
4. لماذا يجب الدخول إلى الأدوات عبر روابطها الرسمية فقط؟
5. اذكر ثلاثة بنود من قسم «الأخلاقيات والقانون» في قائمة التحقق.

<details><summary>الإجابات</summary>

1. الـ Zoom تكبير بصري بالعدسة والكاميرا في مكانها، أما الـ Travelling avant فهو تقدّم الكاميرا نفسها نحو الموضوع، فيتغيّر المنظور والعمق.
2. أن يقدّم النموذج معلومة خاطئة أو مختلقة بثقة كأنها حقيقة.
3. نوع اللقطة، الموضوع، الحدث، المكان، حركة الكاميرا، الإضاءة، الأسلوب، والمدة.
4. لأن هناك مواقع مزيفة تقلّد أسماء الأدوات لسرقة الحسابات وبيانات الدفع، ولأن الأسعار والشروط الصحيحة توجد في الموقع الرسمي فقط.
5. مثلاً: موافقة كل شخص يظهر وجهه أو صوته؛ عدم إظهار شخص حقيقي يقول ما لم يقله؛ التأكد من حقوق الموسيقى والصور؛ عدم استعمال شعارات الغير؛ إظهار المنتج كما هو؛ وسم المحتوى المولَّد.

</details>

---

⬅️ العودة إلى [فهرس الكتاب](README.md)
