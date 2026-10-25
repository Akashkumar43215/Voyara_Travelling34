import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";

import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";
import { sendContactMessage } from "../services/api";
import { CONTACT_LIMITS, CONTACT_SUBJECTS, SITE } from "../config/site";
import { useLanguage } from "../context/LanguageContext";
import { tg } from "../i18n/runtime";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const EMPTY = { name: "", email: "", subject: "", message: "", website: "" };

// the same rules the server applies, so most mistakes are caught before sending
const check = (v) => {
  const errors = {};

  if (v.name.trim().length < 2) errors.name = tg("Please enter your name.");
  if (!EMAIL_PATTERN.test(v.email.trim())) errors.email = tg("Please enter a valid email address.");
  if (!v.subject) errors.subject = tg("Please choose a subject.");
  if (v.message.trim().length < CONTACT_LIMITS.minMessage) {
    errors.message = tg("Please write at least {n} characters.", { n: CONTACT_LIMITS.minMessage });
  }

  return errors;
};

const Contact = () => {
  const { t: tx } = useLanguage();

  const { user, isAuthenticated } = useAuth();

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | failed
  const [failure, setFailure] = useState("");

  // logged-in visitors do not need to retype who they are
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    setValues((v) => ({ ...v, name: v.name || user.name || "", email: v.email || user.email || "" }));
  }, [isAuthenticated, user]);

  const update = (field) => (e) => {
    const value = e.target.value;

    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (status === "sending") return;

    const found = check(values);
    setErrors(found);

    const firstProblem = ["name", "email", "subject", "message"].find((field) => found[field]);

    if (firstProblem) {
      document.getElementById(`contact-${firstProblem}`)?.focus();
      return;
    }

    setStatus("sending");
    setFailure("");

    try {
      await sendContactMessage({
        name: values.name,
        email: values.email,
        subject: values.subject,
        message: values.message,
        website: values.website, // hidden trap for bots, always empty for people
      });

      setStatus("sent");
    } catch (err) {
      const data = err.response?.data;

      if (data?.errors) setErrors(data.errors);
      setFailure(data?.message || tx("We could not send your message. Please check your connection and try again."));
      setStatus("failed");
    }
  };

  const again = () => {
    setValues({ ...EMPTY, name: user?.name || "", email: user?.email || "" });
    setErrors({});
    setStatus("idle");
  };

  const fieldProps = (field) => ({
    id: `contact-${field}`,
    value: values[field],
    onChange: update(field),
    "aria-invalid": errors[field] ? "true" : "false",
    "aria-describedby": errors[field] ? `contact-${field}-error` : undefined,
  });

  const fieldError = (field) =>
    errors[field] ? (
      <span id={`contact-${field}-error`} className="contact-error" role="alert">
        {errors[field]}
      </span>
    ) : null;

  return (
    <div className="contact-page">
      <PageHero
        eyebrow={tx("Contact")}
        icon={<MessageCircle />}
        title={
          <>{tx("We would love to")} <span>{tx("hear from you")}</span></>
        }
        subtitle={tx("Questions about a booking, a place or a hotel? Send us a message and we will get back to you by email.")}
      />

      <section className="section contact-section">
        <div className="container contact-layout">
          {/* ---------- Form ---------- */}
          <div className="contact-card contact-form-card">
            {status === "sent" ? (
              <div className="contact-success" role="status">
                <span className="contact-success-icon">
                  <CheckCircle2 size={34} />
                </span>
                <h2>{tx("Message sent")}</h2>
                <p>{tx("Thank you for writing to us.")} {tx(SITE.responseTime)}</p>

                <div className="contact-success-actions">
                  <button type="button" className="btn btn-primary" onClick={again}>
                    {tx("Send another message")}
                  </button>
                  <Link to="/" className="btn btn-outline">
                    {tx("Back to home")}
                  </Link>
                </div>
              </div>
            ) : (
              <form className="contact-form" onSubmit={submit} noValidate>
                <h2>{tx("Send us a message")}</h2>
                <p className="contact-sub">{tx("All fields are required.")} {tx(SITE.responseTime)}</p>

                {status === "failed" && (
                  <div className="contact-alert" role="alert">
                    <AlertCircle size={18} />
                    <span>{failure}</span>
                  </div>
                )}

                <div className="contact-row">
                  <label className="contact-field" htmlFor="contact-name">
                    <span>{tx("Your name")}</span>
                    <input type="text" autoComplete="name" maxLength={CONTACT_LIMITS.name} placeholder={tx("Priya Nair")} {...fieldProps("name")} />
                    {fieldError("name")}
                  </label>

                  <label className="contact-field" htmlFor="contact-email">
                    <span>{tx("Email address")}</span>
                    <input type="email" autoComplete="email" maxLength={254} placeholder={tx("you@example.com")} {...fieldProps("email")} />
                    {fieldError("email")}
                  </label>
                </div>

                <label className="contact-field" htmlFor="contact-subject">
                  <span>{tx("Subject")}</span>
                  <select {...fieldProps("subject")}>
                    <option value="">{tx("Choose a subject")}</option>
                    {CONTACT_SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {tx(s)}
                      </option>
                    ))}
                  </select>
                  {fieldError("subject")}
                </label>

                <label className="contact-field" htmlFor="contact-message">
                  <span>{tx("Message")}</span>
                  <textarea
                    rows={6}
                    maxLength={CONTACT_LIMITS.message}
                    placeholder={tx("Tell us how we can help. If it is about a booking, include the booking reference (it starts with VOY-).")}
                    {...fieldProps("message")}
                  />
                  <small className="contact-count">
                    {values.message.length} / {CONTACT_LIMITS.message}
                  </small>
                  {fieldError("message")}
                </label>

                {/* Bots fill every field they see. People never see this one. */}
                <div className="contact-trap" aria-hidden="true">
                  <label htmlFor="contact-website">{tx("Leave this empty")}</label>
                  <input
                    id="contact-website"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={values.website}
                    onChange={update("website")}
                  />
                </div>

                <button type="submit" className="btn btn-primary contact-submit" disabled={status === "sending"}>
                  {status === "sending" ? (
                    <>
                      <Loader2 size={18} className="contact-spin" /> {tx("Sending...")}
                    </>
                  ) : (
                    <>
                      <Send size={18} /> {tx("Send message")}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* ---------- Details ---------- */}
          <aside className="contact-side">
            <div className="contact-card contact-info">
              <h2>{tx("Get in touch")}</h2>

              <ul>
                <li>
                  <span className="about-icon">
                    <Mail size={20} />
                  </span>
                  <div>
                    <strong>{tx("Email")}</strong>
                    <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                  </div>
                </li>
                <li>
                  <span className="about-icon">
                    <Phone size={20} />
                  </span>
                  <div>
                    <strong>{tx("Phone")}</strong>
                    <a href={`tel:${SITE.phone.replace(/\s+/g, "")}`}>{SITE.phone}</a>
                  </div>
                </li>
                <li>
                  <span className="about-icon">
                    <Clock size={20} />
                  </span>
                  <div>
                    <strong>{tx("Support hours")}</strong>
                    <span>{tx(SITE.hours)}</span>
                  </div>
                </li>
                <li>
                  <span className="about-icon">
                    <MapPin size={20} />
                  </span>
                  <div>
                    <strong>{tx("Address")}</strong>
                    <span>
                      {SITE.address.map((line) => (
                        <span key={line} className="contact-line">
                          {tx(line)}
                        </span>
                      ))}
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="contact-card contact-help">
              <h2>{tx("Quick help")}</h2>

              <Link to="/trips">
                <Briefcase size={18} />
                <span>
                  <strong>{tx("Change or cancel a booking")}</strong>
                  <small>{tx("Open My Trips to see your bookings")}</small>
                </span>
              </Link>

              <Link to="/about#faq">
                <HelpCircle size={18} />
                <span>
                  <strong>{tx("Read the questions we get most")}</strong>
                  <small>{tx("Payments, prices and cancellation")}</small>
                </span>
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default Contact;
