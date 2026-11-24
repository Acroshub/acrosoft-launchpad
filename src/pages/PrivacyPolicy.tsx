import { LegalLayout, LegalSection, LegalList } from "@/components/shared/LegalLayout";
import { LEGAL } from "@/lib/legal";

const PrivacyPolicy = () => (
  <LegalLayout title="Privacy Policy">
    <LegalSection title="1. Who we are">
      <p>
        {LEGAL.brand} ("we", "us") provides online appointment scheduling and appointment-reminder messaging
        to small service businesses (our "Clients"). When you book an appointment through a Client's online
        calendar, we process your information on that Client's behalf and send you the confirmations and
        reminders you asked for.
      </p>
    </LegalSection>

    <LegalSection title="2. Information we collect">
      <p>When you book an appointment we collect what you enter in the booking form:</p>
      <LegalList items={[
        "Your name",
        "Your mobile phone number",
        "Your service address (street address, city, state and ZIP code)",
        "Your email address, if the form asks for it",
        "The date and time of your appointment",
      ]} />
      <p>
        If you choose to receive text messages, we also keep a record of your consent: the date and time, the
        exact consent wording you saw, your phone number and the calendar you booked on. We keep technical logs
        of the messages we send you (delivery status and timestamps).
      </p>
    </LegalSection>

    <LegalSection title="3. How we use your information">
      <LegalList items={[
        "To schedule your appointment and let the business know when and where to show up",
        "To send you appointment confirmations and reminders by text message (only if you opted in), email or other channels you agreed to",
        "To respond to your questions and requests, including STOP and HELP replies",
        "To keep our service secure, prevent abuse and meet legal obligations",
      ]} />
      <p>We do not use your information for advertising and we do not build marketing profiles about you.</p>
    </LegalSection>

    <LegalSection id="sms" title="4. Text messaging (SMS) and your mobile information">
      <p>
        We send appointment-related text messages (confirmations and reminders) only to people who opted in by
        checking the text-message consent box on the booking form. Consent is optional and is not required to
        book an appointment. You can withdraw it at any time by replying <strong>STOP</strong> to any message.
      </p>
      <p>
        <strong>
          No mobile information will be shared with third parties/affiliates for marketing/promotional
          purposes. All the above categories exclude text messaging originator opt-in data and consent; this
          information will not be shared with any third parties.
        </strong>
      </p>
      <p>
        Message frequency varies depending on your appointments. Message and data rates may apply. For more
        details see our <a href={`${LEGAL.termsPath}#sms`} className="text-primary underline underline-offset-2">SMS terms</a>.
      </p>
    </LegalSection>

    <LegalSection title="5. Who we share information with">
      <p>We do not sell your personal information. We share it only as needed to run the service:</p>
      <LegalList items={[
        "With the business you booked with (our Client), so they can serve you",
        "With service providers that act on our instructions, such as cloud hosting, email delivery and the telecommunications provider that delivers text messages. They may use your information only to provide those services to us",
        "When required by law, or to protect the rights, safety and security of our users and our service",
      ]} />
    </LegalSection>

    <LegalSection title="6. Retention and security">
      <p>
        We keep your information for as long as the Client's account is active and as needed to provide the
        service and to keep proof of your consent. We protect it with industry-standard technical and
        organizational measures, including encrypted connections and access controls. No system is completely
        secure, so we cannot guarantee absolute security.
      </p>
    </LegalSection>

    <LegalSection title="7. Your choices and rights">
      <LegalList items={[
        <>Text messages: reply <strong>STOP</strong> at any time to stop receiving them, or <strong>HELP</strong> for help.</>,
        <>You can ask us to access, correct or delete your information by emailing <a href={`mailto:${LEGAL.supportEmail}`} className="text-primary underline underline-offset-2">{LEGAL.supportEmail}</a>. We may route the request to the business you booked with.</>,
      ]} />
    </LegalSection>

    <LegalSection title="8. Children">
      <p>Our service is not directed to children under 13, and we do not knowingly collect their information.</p>
    </LegalSection>

    <LegalSection title="9. Changes to this policy">
      <p>
        We may update this policy from time to time. The "Last updated" date at the top shows when it last
        changed. If a change affects how we send text messages, we will ask for your consent again where the
        law requires it.
      </p>
    </LegalSection>

    <LegalSection title="10. Contact us">
      <p>
        {LEGAL.brand} ·{" "}
        <a href={`mailto:${LEGAL.supportEmail}`} className="text-primary underline underline-offset-2">{LEGAL.supportEmail}</a>
      </p>
    </LegalSection>
  </LegalLayout>
);

export default PrivacyPolicy;
