import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {ImapFlow} from 'imapflow';
import './audit-live-helpers.mjs';

const liveResults = JSON.parse(await readFile('output/audit-local-20261013/live-results.json', 'utf8'));
const messageId = liveResults.messageId;
assert.ok(messageId, 'messageId must be present in live-results.json');

const report = {
  at: new Date().toISOString(),
  targetMessageId: messageId,
  checks: []
};

let imap;
try {
  imap = new ImapFlow({
    host: 'imap.hostinger.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    logger: false,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  });

  await imap.connect();
  await imap.mailboxOpen('INBOX', {readOnly: true});
  assert.equal(imap.mailbox.readOnly, true);

  const found = await imap.search({header: {'message-id': messageId}}, {uid: true});
  if (!found?.length) {
    report.checks.push({
      name: 'Receipt in INBOX',
      status: 'NOT_FOUND',
      evidence: {messageId}
    });
    console.log(JSON.stringify({status: 'NOT_FOUND', messageId}));
  } else {
    const msg = await imap.fetchOne(found[0], {envelope: true, flags: true}, {uid: true});
    assert.equal(msg.envelope.messageId, messageId);
    report.checks.push({
      name: 'Actual receipt in read-only INBOX',
      status: 'PASS',
      evidence: {
        messageId,
        uid: found[0],
        from: msg.envelope.from.map(x => x.address),
        to: msg.envelope.to.map(x => x.address),
        subject: msg.envelope.subject,
        readOnly: imap.mailbox.readOnly
      }
    });
    console.log(JSON.stringify({
      status: 'PASS',
      messageId,
      uid: found[0],
      from: msg.envelope.from.map(x => x.address),
      to: msg.envelope.to.map(x => x.address),
      subject: msg.envelope.subject
    }));
  }
} catch (e) {
  report.checks.push({name: 'IMAP check error', status: 'FAIL', evidence: e.message});
  console.error('FAIL ' + e.message);
  process.exitCode = 1;
} finally {
  if (imap) {
    await imap.logout().catch(() => imap.close());
  }
  await writeFile('output/audit-local-20261013/live-receipt-cesare.json', JSON.stringify(report, null, 2));
}
