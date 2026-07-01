import { Panel } from "./Common";

type AssistantPanelProps = {
  recommendations: Array<{ title: string; message: string }>;
};

export default function AssistantPanel({ recommendations }: AssistantPanelProps) {
  return (
    <Panel title="Assistant notes" subtitle="Plain-language guidance based on your current figures">
      <div className="assistant-list">
        {recommendations.length === 0 ? (
          <div className="empty-state">No recommendations yet. Add finance settings to start seeing guidance.</div>
        ) : (
          recommendations.map((item) => (
            <article key={item.title} className="assistant-card">
              <div className="assistant-title">{item.title}</div>
              <p className="assistant-message">{item.message}</p>
            </article>
          ))
        )}
      </div>
    </Panel>
  );
}
