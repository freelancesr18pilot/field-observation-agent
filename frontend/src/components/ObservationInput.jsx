import { useState, useEffect } from "react";
import styles from "./ObservationInput.module.css";
import { API_BASE } from "../config.js";
import { useT, useLang } from "../LanguageContext.jsx";

const EXAMPLE_OBSERVATIONS = [
  {
    labelKey: "ex1",
    en: "visited rampur today. met priya s mother who said priya hasnt been in school since 2 weeks. she was helping at home because father left again for work up north somewhere. the little ones need someone to look after them. mother seemed tired and coughing badly. priya herself said she wants to go to school but what can she do. the teacher also told me priya was always good in math.",
    hi: "आज सुनीता के घर गई। वो 10 साल की है, कक्षा 4 में पढ़ती है। पिछले 4 हफ्तों से स्कूल नहीं आई। माँ ने कहा घर पर काम है। पाँच बच्चे हैं, सुनीता सबसे बड़ी है। पिता पिछले महीने चोटिल हो गए और काम नहीं कर सकते। पड़ोसी ने बताया कि गली की दो और लड़कियाँ भी स्कूल छोड़ चुकी हैं।",
  },
  {
    labelKey: "ex2",
    en: "Raju from shivpur brick area not coming school for 3 months now. i went to kiln and saw him carrying bricks with father. owner was watching. raju looked thin and tired. he used to be in class 6. when i talked to father he said debt is not paid how can boy go school. CWC wale aaye the but nothing happened. i am worried this boy will never go back.",
    hi: "राजू शिवपुर ईंट भट्टे से 3 महीने से स्कूल नहीं आया। मैं भट्टे पर गया तो देखा वो अपने पिता के साथ ईंटें ढो रहा था, मालिक देख रहा था। राजू दुबला और थका हुआ लग रहा था। वो कक्षा 6 में था। पिता से बात की तो बोले कर्ज नहीं चुका तो लड़का स्कूल कैसे जाए। CWC वाले आए थे पर कुछ नहीं हुआ। मुझे डर है यह बच्चा कभी वापस नहीं जाएगा।",
  },
  {
    labelKey: "ex3",
    en: "Sunita from chandanpur - I heard from her teacher that she has started missing alternate days. Her mama came to meet them last week and there was talk about a boy from next village. Sunita's mother called me quietly and said she is scared they will pull her out of school. The girl is very bright, top in her class. Its very urgent. What residential school options we have for girls like her?",
    hi: "चंदनपुर की सुनीता के बारे में उसकी शिक्षिका ने बताया कि वो एक दिन छोड़कर एक दिन स्कूल आने लगी है। पिछले हफ्ते उसके मामा आए थे और पड़ोस के लड़के की बात हो रही थी। सुनीता की माँ ने मुझे अकेले में बुलाकर कहा कि उन्हें डर है कि उसे स्कूल से निकाल लेंगे। लड़की बहुत होशियार है, कक्षा में अव्वल है। बहुत जरूरी है। ऐसी लड़कियों के लिए आवासीय स्कूल के क्या विकल्प हैं?",
  },
  {
    labelKey: "ex4",
    en: "kavita situation is getting worse in shivpur. i went today and her mother had marks on her arm. kavita was sitting outside not talking. when i asked she said father came home drunk again last night and there was fighting. she said she is scared to go to school because she doesnt want to leave her brothers alone. the 2 younger boys are 4 and 6 years. what are our options for this family",
    hi: "शिवपुर में कविता की स्थिति और खराब होती जा रही है। आज गई तो उसकी माँ के हाथ पर निशान थे। कविता बाहर बैठी थी, कुछ नहीं बोल रही थी। पूछने पर बोली कल रात पिता घर पर नशे में आए थे और लड़ाई हुई। उसने कहा स्कूल जाने से डर लगता है क्योंकि छोटे भाइयों को अकेले नहीं छोड़ना चाहती। दो छोटे लड़के 4 और 6 साल के हैं। इस परिवार के लिए हमारे पास क्या विकल्प हैं?",
  },
  {
    labelKey: "ex5",
    en: "amit verma from lakshmipur class 5. the boy is very weak and thin. when i met him today he said he has had fever for 4 days. mother said she cannot afford doctor. he missed 12 days this month itself. his weight looks like 22 kg max which is very low for 11 year. teacher says when he does come to school he is sleepy and cannot concentrate. the midday meal is probably the only good food he gets.",
    hi: "लक्ष्मीपुर का अमित वर्मा, कक्षा 5। लड़का बहुत कमजोर और दुबला है। आज मिला तो बोला 4 दिनों से बुखार है। माँ ने कहा डॉक्टर का खर्च नहीं उठा सकती। इस महीने 12 दिन स्कूल नहीं आया। उसका वजन ज्यादा से ज्यादा 22 किलो लगता है जो 11 साल के बच्चे के लिए बहुत कम है। शिक्षक कहते हैं जब भी आता है सोया-सोया रहता है और ध्यान नहीं लगा पाता। मध्याह्न भोजन शायद उसका एकमात्र अच्छा खाना है।",
  },
];

export default function ObservationInput({ onSubmit, isLoading }) {
  const t = useT();
  const { lang } = useLang();
  const [text, setText] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/observations`).catch(() => {});
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (text.trim().length >= 10) onSubmit(text.trim());
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("inputTitle")}</h2>
        <p className={styles.subtitle}>{t("inputSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          rows={6}
          disabled={isLoading}
        />

        <div className={styles.actions}>
          <div className={styles.examples}>
            <span className={styles.exampleLabel}>{t("loadExample")}</span>
            {EXAMPLE_OBSERVATIONS.map((ex, i) => (
              <button
                key={i}
                type="button"
                className={styles.exampleBtn}
                onClick={() => setText(ex[lang] || ex.en)}
                disabled={isLoading}
              >
                {t(ex.labelKey)}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading || text.trim().length < 10}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                {t("submitBtnLoading")}
              </>
            ) : (
              t("submitBtn")
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
