import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type Mail = { to: string; subject: string; text: string; html: string };

const RESEND_URL = "https://api.resend.com/emails";

/** Sends through Resend when RESEND_API_KEY is set; otherwise writes the mail to data/outbox. */
export async function send(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const outbox = join(process.env.DATA_DIR ?? "data", "outbox");
    await mkdir(outbox, { recursive: true });
    await writeFile(join(outbox, `${Date.now()}.json`), JSON.stringify(mail, null, 2));
    console.log(`  mail (outbox): ${mail.subject}`);
    return;
  }

  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "Gathæro <results@gathaero.space>",
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });
  if (!response.ok) throw new Error(`mail failed: ${response.status} ${await response.text()}`);
  console.log(`  mail sent: ${mail.subject}`);
}
