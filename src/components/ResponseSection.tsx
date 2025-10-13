import MarkdownRenderer from "../utils/MarkdownRenderer";

export default function ResponseSection({
  response,
}: {
  response: string;
  isCopied: boolean;
}) {
  return (
    <section>
      <div className="markdown-container">
        <MarkdownRenderer content={response} />
      </div>
    </section>
  );
}
