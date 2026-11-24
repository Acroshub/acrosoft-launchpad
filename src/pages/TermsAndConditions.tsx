import { LegalLayout, LegalSection, LegalList } from "@/components/shared/LegalLayout";
import { LEGAL } from "@/lib/legal";

const mail = (
  <a href={`mailto:${LEGAL.supportEmail}`} className="text-primary underline underline-offset-2">{LEGAL.supportEmail}</a>
);

const TermsAndConditions = () => (
  <LegalLayout title="Terms and Conditions">
    <LegalSection title="1. About these terms">
      <p>
        These terms apply when you book an appointment through an online calendar provided by {LEGAL.brand}
        ("we", "us") on behalf of a business (our "Client"), and when you receive messages from us about that
        appointment. By booking you agree to them. Our{" "}
        <a href={LEGAL.privacyPath} className="text-primary underline underline-offset-2">Privacy Policy</a>{" "}
        explains how we handle your information.
      </p>
    </LegalSection>

    <LegalSection title="2. Our service">
      <p>
        {LEGAL.brand} provides online scheduling and appointment-reminder messaging for small service
        businesses. The appointment itself is an agreement between you and the business you booked with; we are
        not a party to it and we do not provide the services the business offers.
      </p>
    </LegalSection>

    <LegalSection id="sms" title="3. SMS messaging program: Appointment Reminders">
      <LegalList items={[
        <><strong>Program name:</strong> {LEGAL.brand} Appointment Reminders.</>,
        <><strong>What you will receive:</strong> text messages about the appointment you booked, such as a confirmation and reminders, sent by {LEGAL.brand} on behalf of the business you booked with. We do not send marketing or promotional messages through this program.</>,
        <><strong>How you opt in:</strong> by checking the separate, unchecked text-message consent box on an online booking form, or on our{" "}
          <a href={LEGAL.smsSignupPath} className="text-primary underline underline-offset-2">SMS sign-up page</a>, and submitting the form. Opting in is optional and is not a condition of booking an appointment or of buying anything.</>,
        <><strong>Message frequency:</strong> varies depending on your appointments.</>,
        <><strong>Costs:</strong> message and data rates may apply, depending on your mobile plan. We do not charge you for the messages.</>,
        <><strong>Opt out:</strong> reply <strong>STOP</strong> to any message at any time. You will get one confirmation message and then no more texts. Opting out of text messages does not cancel your appointment.</>,
        <><strong>Help:</strong> reply <strong>HELP</strong> to any message, or email {mail}.</>,
        <><strong>Carriers:</strong> wireless carriers and their partners are not liable for delayed or undelivered messages.</>,
        <><strong>Your information:</strong> see our <a href={`${LEGAL.privacyPath}#sms`} className="text-primary underline underline-offset-2">Privacy Policy</a>. We do not share your mobile information or your opt-in consent with third parties for marketing or promotional purposes.</>,
      ]} />
    </LegalSection>

    <LegalSection title="4. Your responsibilities">
      <LegalList items={[
        "Give accurate information when you book, including a mobile number that belongs to you",
        "Only use the booking form for real appointments you intend to keep",
        "Not misuse the service, interfere with it or attempt to access it without authorization",
      ]} />
    </LegalSection>

    <LegalSection title="5. Availability and changes">
      <p>
        We try to keep the service available and the messages timely, but we do not guarantee uninterrupted
        service or that every message will be delivered. We may change or discontinue parts of the service, and
        we may update these terms; the "Last updated" date shows the latest version.
      </p>
    </LegalSection>

    <LegalSection title="6. Disclaimer and limit of liability">
      <p>
        The service is provided "as is". To the fullest extent permitted by law, {LEGAL.brand} is not liable
        for indirect or consequential damages, or for the quality, timing or cancellation of the services
        provided by the business you booked with.
      </p>
    </LegalSection>

    <LegalSection title="7. Contact us">
      <p>
        {LEGAL.brand} · {mail}
      </p>
    </LegalSection>
  </LegalLayout>
);

export default TermsAndConditions;
