import { useState, useEffect } from "react";
import styles from "./ObservationInput.module.css";
import { API_BASE } from "../config.js";

const EXAMPLE_OBSERVATIONS = [
  {
    label: "Child absent — migration",
    text: "visited rampur today. met priya s mother who said priya hasnt been in school since 2 weeks. she was helping at home because father left again for work up north somewhere. the little ones need someone to look after them. mother seemed tired and coughing badly. priya herself said she wants to go to school but what can she do. the teacher also told me priya was always good in math.",
  },
  {
    label: "Child labor — brick kiln",
    text: "Raju from shivpur brick area not coming school for 3 months now. i went to kiln and saw him carrying bricks with father. owner was watching. raju looked thin and tired. he used to be in class 6. when i talked to father he said debt is not paid how can boy go school. CWC wale aaye the but nothing happened. i am worried this boy will never go back.",
  },
  {
    label: "Early marriage risk",
    text: "Sunita from chandanpur - I heard from her teacher that she has started missing alternate days. Her mama came to meet them last week and there was talk about a boy from next village. Sunita's mother called me quietly and said she is scared they will pull her out of school. The girl is very bright, top in her class. Its very urgent. What residential school options we have for girls like her?",
  },
  {
    label: "Domestic violence",
    text: "kavita situation is getting worse in shivpur. i went today and her mother had marks on her arm. kavita was sitting outside not talking. when i asked she said father came home drunk again last night and there was fighting. she said she is scared to go to school because she doesnt want to leave her brothers alone. the 2 younger boys are 4 and 6 years. what are our options for this family",
  },
  {
    label: "Malnutrition + absence",
    text: "amit verma from lakshmipur class 5. the boy is very weak and thin. when i met him today he said he has had fever for 4 days. mother said she cannot afford doctor. he missed 12 days this month itself. his weight looks like 22 kg max which is very low for 11 year. teacher says when he does come to school he is sleepy and cannot concentrate. the midday meal is probably the only good food he gets.",
  },
];

export default function ObservationInput({ onSubmit, isLoading }) {
  const [text, setText] = useState("");
  const [observations, setObservations] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/observations`)
      .then((r) => r.json())
      .then((d) => setObservations(d.observations || []))
      .catch(() => {});
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (text.trim().length >= 10) onSubmit(text.trim());
  }

  function loadExample(obsText) {
    setText(obsText);
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Field Observation</h2>
        <p className={styles.subtitle}>
          Paste or type a raw field note. The agent will reason through it and
          generate an action plan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. visited rampur today. priya hasnt been in school for 2 weeks. her father left for harvest work..."
          rows={6}
          disabled={isLoading}
        />

        <div className={styles.actions}>
          <div className={styles.examples}>
            <span className={styles.exampleLabel}>Load example:</span>
            {EXAMPLE_OBSERVATIONS.map((ex, i) => (
              <button
                key={i}
                type="button"
                className={styles.exampleBtn}
                onClick={() => loadExample(ex.text)}
                disabled={isLoading}
              >
                {ex.label}
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
                Reasoning...
              </>
            ) : (
              "Analyze Observation"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
