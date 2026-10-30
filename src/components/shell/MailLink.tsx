// The email: a plain mailto link that opens your mail app.
export function MailLink({ email }: { email: string }) {
  return (
    <a id="mail" className="mail" href={`mailto:${email}`}>
      {email}
    </a>
  );
}
