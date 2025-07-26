"use client"

// Custom Icon: Zwei Währungen (z.B. Dollar und Euro)
function CurrencyPairIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Dollar Symbol */}
      <circle cx="7" cy="10" r="4.2" stroke="currentColor" strokeWidth="1.3" fill="#fff" />
      <path d="M7 7.2V12.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M6.1 8.7C6.4 8.3 6.8 8.1 7.3 8.1C7.9 8.1 8.4 8.5 8.4 9.1C8.4 9.7 8 10 7.2 10.2C6.4 10.4 6 10.7 6 11.2C6 11.8 6.6 12.2 7.3 12.2C7.8 12.2 8.2 12 8.5 11.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Euro Symbol */}
      <circle cx="13" cy="10" r="4.2" stroke="currentColor" strokeWidth="1.3" fill="#fff" />
      <path d="M14.2 8.6C13.9 8.3 13.5 8.1 13 8.1C11.9 8.1 11.2 9.1 11.2 10C11.2 10.9 11.9 11.9 13 11.9C13.5 11.9 13.9 11.7 14.2 11.4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M12.1 9.4H13.9" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M12.1 10.6H13.9" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      {/* Trennlinie */}
      <line x1="9.2" y1="6.5" x2="10.8" y2="13.5" stroke="currentColor" strokeWidth="0.7" strokeDasharray="2 1" />
    </svg>
  );
}




import {
  BarChart2,
  DollarSign,
  Receipt,
  Building2,
  CreditCard,
  Folder,
  Wallet,
  Users2,
  Shield,
  CalendarDays,
  MessagesSquare,
  Settings,
  HelpCircle,
  Menu,
  Globe,
  X,
  CupSoda,
  Gauge,
} from "lucide-react"

import { Home } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useTheme } from "next-themes"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog"
import Image from "next/image"

interface SidebarProps {
  visibleModules: string[];
  showModule: (module: string) => void;
  hideModule: (module: string) => void;
}

export default function Sidebar({ visibleModules, showModule }: SidebarProps) {

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  function handleNavigation() {
    setIsMobileMenuOpen(false);
  }

  function ModuleButton({ module, icon: Icon, label }: { module: string; icon: any; label: string }) {
    const isVisible = visibleModules.includes(module);
    // Farben dynamisch je nach Theme setzen
    let baseClasses = "flex items-center px-3 py-2 text-sm rounded-md transition-colors w-full text-left";
    let activeClasses = currentTheme === "dark"
      ? "bg-transparent text-white"
      : "bg-transparent text-black";
    let inactiveClasses = currentTheme === "dark"
      ? "bg-[#1F1F23] text-gray-200 hover:bg-[#23232a] hover:text-white"
      : "bg-black text-white hover:bg-black hover:text-white";
    return (
      <button
        onClick={() => isVisible ? null : showModule(module)}
        disabled={isVisible}
        className={[
          baseClasses,
          isVisible ? activeClasses : inactiveClasses
        ].join(" ")}
      >
        <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
        {label}
      </button>
    );
  }

function SimpleNavItem({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }): React.ReactElement {
    // Special handling for About, Our Mission, Privacy Policy, Terms of Service, and Contact
    if (["/settings/about", "/settings/mission", "/settings/privacy-policy", "/settings/terms-of-service", "/settings/contact"].includes(href)) {
      let title = "";
      let description = null;
      if (href === "/settings/about") {
        title = "About";
        description = (
          <div className="prose prose-neutral dark:prose-invert px-1">
            <h2>WELCOME</h2>
            <p>Exchange Time is your comprehensive platform for tracking global market hours and analyzing financial markets in real-time.</p>
            <p>Our mission is to provide traders and investors with accurate, timely information about market operations worldwide.</p>
            <h3>Key Features:</h3>
            <ul>
              <li>Real-time market status tracking</li>
              <li>Global exchange hours</li>
              <li>Market analysis tools</li>
              <li>Trading calendars</li>
            </ul>
          </div>
        );
      } else if (href === "/settings/mission") {
        title = "Our Mission";
        description = (
          <div className="prose prose-neutral dark:prose-invert px-1">
            <h2>OUR VISION</h2>
            <p>To become the world's most trusted platform for global market intelligence and timing.</p>
            <h2>OUR MISSION STATEMENT</h2>
            <p>Exchange Time is dedicated to empowering traders and investors worldwide by providing:</p>
            <ul>
              <li>Accurate and real-time market information</li>
              <li>Comprehensive trading tools and analysis</li>
              <li>Educational resources for better trading decisions</li>
              <li>Innovative solutions for global market timing</li>
            </ul>
            <h2>OUR VALUES</h2>
            <ul>
              <li>Accuracy and Reliability</li>
              <li>Innovation and Technology</li>
              <li>User-Centric Design</li>
              <li>Global Accessibility</li>
            </ul>
          </div>
        );
      } else if (href === "/settings/privacy-policy") {
        title = "Privacy Policy";
        description = (
          <div className="max-h-[70vh] overflow-y-auto prose prose-neutral dark:prose-invert px-1">
            <p className="text-sm text-gray-500">Last updated March 07, 2025</p>
            <p>
              This Privacy Notice for Exchange Time ("we," "us," or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:
            </p>
            <ul>
              <li>Visit our website at <a href="http://www.exchangetime.de" className="underline">http://www.exchangetime.de</a>, or any website of ours that links to this Privacy Notice</li>
              <li>Engage with us in other related ways, including any sales, marketing, or events</li>
            </ul>
            <p>
              Questions or concerns? Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at <a href="mailto:info@exchangetime.de" className="underline">info@exchangetime.de</a>.
            </p>
            <h2>SUMMARY OF KEY POINTS</h2>
            <p>This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents below to find the section you are looking for.</p>
            <ul>
              <li><b>What personal information do we process?</b> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use. Learn more about personal information you disclose to us.</li>
              <li><b>Do we process any sensitive personal information?</b> Some of the information may be considered "special" or "sensitive" in certain jurisdictions, for example your racial or ethnic origins, sexual orientation, and religious beliefs. We do not process sensitive personal information.</li>
              <li><b>Do we collect any information from third parties?</b> We do not collect any information from third parties.</li>
              <li><b>How do we process your information?</b> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent. We process your information only when we have a valid legal reason to do so. Learn more about how we process your information.</li>
              <li><b>In what situations and with which parties do we share personal information?</b> We may share information in specific situations and with specific third parties. Learn more about when and with whom we share your personal information.</li>
              <li><b>How do we keep your information safe?</b> We have adequate organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Learn more about how we keep your information safe.</li>
              <li><b>What are your rights?</b> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information. Learn more about your privacy rights.</li>
              <li><b>How do you exercise your rights?</b> The easiest way to exercise your rights is by submitting a data subject access request, or by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.</li>
              <li>Want to learn more about what we do with any information we collect? Review the Privacy Notice in full.</li>
            </ul>
            <h2>TABLE OF CONTENTS</h2>
            <ol>
              <li>WHAT INFORMATION DO WE COLLECT?</li>
              <li>HOW DO WE PROCESS YOUR INFORMATION?</li>
              <li>WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?</li>
              <li>WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</li>
              <li>WHAT IS OUR STANCE ON THIRD-PARTY WEBSITES?</li>
              <li>DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</li>
              <li>HOW LONG DO WE KEEP YOUR INFORMATION?</li>
              <li>HOW DO WE KEEP YOUR INFORMATION SAFE?</li>
              <li>DO WE COLLECT INFORMATION FROM MINORS?</li>
              <li>WHAT ARE YOUR PRIVACY RIGHTS?</li>
              <li>CONTROLS FOR DO-NOT-TRACK FEATURES</li>
              <li>DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</li>
              <li>DO WE MAKE UPDATES TO THIS NOTICE?</li>
              <li>HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</li>
              <li>HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</li>
            </ol>
            <h2>1. WHAT INFORMATION DO WE COLLECT?</h2>
            <h3>PERSONAL INFORMATION YOU DISCLOSE TO US</h3>
            <p><b>In Short:</b> We collect personal information that you provide to us.</p>
            <p>We collect personal information that you voluntarily provide to us when you express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.</p>
            <p><b>Sensitive Information.</b> We do not process sensitive information.</p>
            <p>All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.</p>
            <h3>INFORMATION AUTOMATICALLY COLLECTED</h3>
            <p><b>In Short:</b> Some information — such as your Internet Protocol (IP) address and/or browser and device characteristics — is collected automatically when you visit our Services.</p>
            <p>We automatically collect certain information when you visit, use, or navigate the Services. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Services, and other technical information. This information is primarily needed to maintain the security and operation of our Services, and for our internal analytics and reporting purposes.</p>
            <p>Like many businesses, we also collect information through cookies and similar technologies.</p>
            <p><b>The information we collect includes:</b></p>
            <ul>
              <li><b>Log and Usage Data.</b> Log and usage data is service-related, diagnostic, usage, and performance information our servers automatically collect when you access or use our Services and which we record in log files. Depending on how you interact with us, this log data may include your IP address, device information, browser type, and settings and information about your activity in the Services (such as the date/time stamps associated with your usage, pages and files viewed, searches, and other actions you take such as which features you use), device event information (such as system activity, error reports (sometimes called "crash dumps"), and hardware settings).</li>
            </ul>
            <h2>2. HOW DO WE PROCESS YOUR INFORMATION?</h2>
            <p><b>In Short:</b> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.</p>
            <p>We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</p>
            <ul>
              <li>To save or protect an individual's vital interest. We may process your information when necessary to save or protect an individual’s vital interest, such as to prevent harm.</li>
            </ul>
            <h2>3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR INFORMATION?</h2>
            <p><b>In Short:</b> We only process your personal information when we believe it is necessary and we have a valid legal reason (i.e., legal basis) to do so under applicable law, like with your consent, to comply with laws, to provide you with services to enter into or fulfill our contractual obligations, to protect your rights, or to fulfill our legitimate business interests.</p>
            <p>If you are located in the EU or UK, this section applies to you.</p>
            <p>The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases we rely on in order to process your personal information. As such, we may rely on the following legal bases to process your personal information:</p>
            <ul>
              <li><b>Consent.</b> We may process your information if you have given us permission (i.e., consent) to use your personal information for a specific purpose. You can withdraw your consent at any time. Learn more about withdrawing your consent.</li>
              <li><b>Legal Obligations.</b> We may process your information where we believe it is necessary for compliance with our legal obligations, such as to cooperate with a law enforcement body or regulatory agency, exercise or defend our legal rights, or disclose your information as evidence in litigation in which we are involved.</li>
              <li><b>Vital Interests.</b> We may process your information where we believe it is necessary to protect your vital interests or the vital interests of a third party, such as situations involving potential threats to the safety of any person.</li>
            </ul>
            <p>If you are located in Canada, this section applies to you.</p>
            <p>We may process your information if you have given us specific permission (i.e., express consent) to use your personal information for a specific purpose, or in situations where your permission can be inferred (i.e., implied consent). You can withdraw your consent at any time.</p>
            <p>In some exceptional cases, we may be legally permitted under applicable law to process your information without your consent, including, for example:</p>
            <ul>
              <li>If collection is clearly in the interests of an individual and consent cannot be obtained in a timely way</li>
              <li>For investigations and fraud detection and prevention</li>
              <li>For business transactions provided certain conditions are met</li>
              <li>If it is contained in a witness statement and the collection is necessary to assess, process, or settle an insurance claim</li>
              <li>For identifying injured, ill, or deceased persons and communicating with next of kin</li>
              <li>If we have reasonable grounds to believe an individual has been, is, or may be victim of financial abuse</li>
              <li>If it is reasonable to expect collection and use with consent would compromise the availability or the accuracy of the information and the collection is reasonable for purposes related to investigating a breach of an agreement or a contravention of the laws of Canada or a province</li>
              <li>If disclosure is required to comply with a subpoena, warrant, court order, or rules of the court relating to the production of records</li>
              <li>If it was produced by an individual in the course of their employment, business, or profession and the collection is consistent with the purposes for which the information was produced</li>
              <li>If the collection is solely for journalistic, artistic, or literary purposes</li>
              <li>If the information is publicly available and is specified by the regulations</li>
            </ul>
            <h2>4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</h2>
            <p><b>In Short:</b> We may share information in specific situations described in this section and/or with the following third parties.</p>
            <p>We may need to share your personal information in the following situations:</p>
            <ul>
              <li><b>Business Transfers.</b> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
            </ul>
            <h2>5. WHAT IS OUR STANCE ON THIRD-PARTY WEBSITES?</h2>
            <p><b>In Short:</b> We are not responsible for the safety of any information that you share with third parties that we may link to or who advertise on our Services, but are not affiliated with, our Services.</p>
            <p>The Services may link to third-party websites, online services, or mobile applications and/or contain advertisements from third parties that are not affiliated with us and which may link to other websites, services, or applications. Accordingly, we do not make any guarantee regarding any such third parties, and we will not be liable for any loss or damage caused by the use of such third-party websites, services, or applications. The inclusion of a link towards a third-party website, service, or application does not imply an endorsement by us. We cannot guarantee the safety and privacy of data you provide to any third-party websites. Any data collected by third parties is not covered by this Privacy Notice. We are not responsible for the content or privacy and security practices and policies of any third parties, including other websites, services, or applications that may be linked to or from the Services. You should review the policies of such third parties and contact them directly to respond to your questions.</p>
            <h2>6. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</h2>
            <p><b>In Short:</b> We may use cookies and other tracking technologies to collect and store your information.</p>
            <p>We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information when you interact with our Services. Some online tracking technologies help us maintain the security of our Services, prevent crashes, fix bugs, save your preferences, and assist with basic site functions.</p>
            <p>We also permit third parties and service providers to use online tracking technologies on our Services for analytics and advertising, including to help manage and display advertisements, to tailor advertisements to your interests, or to send abandoned shopping cart reminders (depending on your communication preferences). The third parties and service providers use their technology to provide advertising about products and services tailored to your interests which may appear either on our Services or on other websites.</p>
            <p>To the extent these online tracking technologies are deemed to be a "sale"/"sharing" (which includes targeted advertising, as defined under the applicable laws) under applicable US state laws, you can opt out of these online tracking technologies by submitting a request as described below under section "DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?"</p>
            <p>Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.</p>
            <h2>7. HOW LONG DO WE KEEP YOUR INFORMATION?</h2>
            <p><b>In Short:</b> We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.</p>
            <p>We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements).</p>
            <p>When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.</p>
            <h2>8. HOW DO WE KEEP YOUR INFORMATION SAFE?</h2>
            <p><b>In Short:</b> We aim to protect your personal information through a system of organizational and technical security measures.</p>
            <p>We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk. You should only access the Services within a secure environment.</p>
            <h2>9. DO WE COLLECT INFORMATION FROM MINORS?</h2>
            <p><b>In Short:</b> We do not knowingly collect data from or market to children under 18 years of age.</p>
            <p>We do not knowingly collect, solicit data from, or market to children under 18 years of age, nor do we knowingly sell such personal information. By using the Services, you represent that you are at least 18 or that you are the parent or guardian of such a minor and consent to such minor dependent’s use of the Services. If we learn that personal information from users less than 18 years of age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of any data we may have collected from children under age 18, please contact us at info@exchangetime.de .</p>
            <h2>10. WHAT ARE YOUR PRIVACY RIGHTS?</h2>
            <p><b>In Short:</b> Depending on your state of residence in the US or in some regions, such as the European Economic Area (EEA), United Kingdom (UK), Switzerland, and Canada, you have rights that allow you greater access to and control over your personal information. You may review, change, or terminate your account at any time, depending on your country, province, or state of residence.</p>
            <p>In some regions (like the EEA, UK, Switzerland, and Canada), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; (iv) if applicable, to data portability; and (v) not to be subject to automated decision-making. In certain circumstances, you may also have the right to object to the processing of your personal information. You can make such a request by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.</p>
            <p>We will consider and act upon any request in accordance with applicable data protection laws.</p>
            <p>If you are located in the EEA or UK and you believe we are unlawfully processing your personal information, you also have the right to complain to your Member State data protection authority or UK data protection authority.</p>
            <p>If you are located in Switzerland, you may contact the Federal Data Protection and Information Commissioner.</p>
            <p><b>Withdrawing your consent:</b> If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.</p>
            <p>However, please note that this will not affect the lawfulness of the processing before its withdrawal nor, when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.</p>
            <p><b>Cookies and similar technologies:</b> Most Web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove cookies and to reject cookies. If you choose to remove cookies or reject cookies, this could affect certain features or services of our Services. You may also opt out of interest-based advertising by advertisers on our Services.</p>
            <p>If you have questions or comments about your privacy rights, you may email us at info@exchangetime.de.</p>
            <h2>11. CONTROLS FOR DO-NOT-TRACK FEATURES</h2>
            <p>Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage, no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this Privacy Notice.</p>
            <p>California law requires us to let you know how we respond to web browser DNT signals. Because there currently is not an industry or legal standard for recognizing or honoring DNT signals, we do not respond to them at this time.</p>
            <h2>12. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</h2>
            <p><b>In Short:</b> If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Tennessee, Texas, Utah, or Virginia, you may have the right to request access to and receive details about the personal information we maintain about you and how we have processed it, correct inaccuracies, get a copy of, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. More information is provided below.</p>
            <h3>CATEGORIES OF PERSONAL INFORMATION WE COLLECT</h3>
            <p>We have collected the following categories of personal information in the past twelve (12) months:</p>
            <table className="min-w-full text-xs border border-gray-300 dark:border-gray-600 mb-4">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Category</th>
                  <th className="border px-2 py-1">Examples</th>
                  <th className="border px-2 py-1">Collected</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border px-2 py-1">A. Identifiers</td><td className="border px-2 py-1">Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name</td><td className="border px-2 py-1">NO</td></tr>
                <tr><td className="border px-2 py-1">B. Personal information as defined in the California Customer Records statute</td><td className="border px-2 py-1">Name, contact information, education, employment, employment history, and financial information</td><td className="border px-2 py-1">NO</td></tr>
                <tr><td className="border px-2 py-1">C. Protected classification characteristics under state or federal law</td><td className="border px-2 py-1">Gender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic data</td><td className="border px-2 py-1">NO</td></tr>
                <tr><td className="border px-2 py-1">D. Commercial information</td><td className="border px-2 py-1">Transaction information, purchase history, financial details, and payment information</td><td className="border px-2 py-1">NO</td></tr>
                <tr><td className="border px-2 py-1">E. Biometric information</td><td className="border px-2 py-1">Fingerprints and voiceprints</td><td className="border px-2 py-1">NO</td></tr>
                <tr><td className="border px-2 py-1">F. Internet or other similar network activity</td><td className="border px-2 py-1">Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements</td><td className="border px-2 py-1">NO</td></tr>
                <tr><td className="border px-2 py-1">G. Geolocation data</td><td className="border px-2 py-1">Device location</td><td className="border px-2 py-1">NO</td></tr>
                <tr><td className="border px-2 py-1">H. Audio, electronic, sensory, or similar information</td><td className="border px-2 py-1">Images and audio, video or call recordings created in connection with our business activities</td><td className="border px-2 py-1">NO</td></tr>
                <tr><td className="border px-2 py-1">I. Professional or employment-related information</td><td className="border px-2 py-1">Business contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications if you apply for a job with us</td><td className="border px-2 py-1">NO</td></tr>
                <tr><td className="border px-2 py-1">J. Education Information</td><td className="border px-2 py-1">Student records and directory information</td><td className="border px-2 py-1">NO</td></tr>
                <tr><td className="border px-2 py-1">K. Inferences drawn from collected personal information</td><td className="border px-2 py-1">Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual’s preferences and characteristics</td><td className="border px-2 py-1">NO</td></tr>
                <tr><td className="border px-2 py-1">L. Sensitive personal Information</td><td className="border px-2 py-1"></td><td className="border px-2 py-1">NO</td></tr>
              </tbody>
            </table>
            <p>We may also collect other personal information outside of these categories through instances where you interact with us in person, online, or by phone or mail in the context of:</p>
            <ul>
              <li>Receiving help through our customer support channels;</li>
              <li>Participation in customer surveys or contests; and</li>
              <li>Facilitation in the delivery of our Services and to respond to your inquiries.</li>
            </ul>
            <p>We will use and retain the collected personal information as needed to provide the Services or for: Category H - 6 months</p>
            <h3>SOURCES OF PERSONAL INFORMATION</h3>
            <p>Learn more about the sources of personal information we collect in "WHAT INFORMATION DO WE COLLECT?"</p>
            <h3>HOW WE USE AND SHARE PERSONAL INFORMATION</h3>
            <p>Learn more about how we use your personal information in the section, "HOW DO WE PROCESS YOUR INFORMATION?"</p>
            <h3>Will your information be shared with anyone else?</h3>
            <p>We may disclose your personal information with our service providers pursuant to a written contract between us and each service provider. Learn more about how we disclose personal information to in the section, "WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?"</p>
            <p>We may use your personal information for our own business purposes, such as for undertaking internal research for technological development and demonstration. This is not considered to be "selling" of your personal information.</p>
            <p>We have not disclosed, sold, or shared any personal information to third parties for a business or commercial purpose in the preceding twelve (12) months. We will not sell or share personal information in the future belonging to website visitors, users, and other consumers.</p>
            <h3>YOUR RIGHTS</h3>
            <p>You have rights under certain US state data protection laws. However, these rights are not absolute, and in certain cases, we may decline your request as permitted by law. These rights include:</p>
            <ul>
              <li>Right to know whether or not we are processing your personal data</li>
              <li>Right to access your personal data</li>
              <li>Right to correct inaccuracies in your personal data</li>
              <li>Right to request the deletion of your personal data</li>
              <li>Right to obtain a copy of the personal data you previously shared with us</li>
              <li>Right to non-discrimination for exercising your rights</li>
              <li>Right to opt out of the processing of your personal data if it is used for targeted advertising (or sharing as defined under California’s privacy law), the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects ("profiling")</li>
            </ul>
            <p>Depending upon the state where you live, you may also have the following rights:</p>
            <ul>
              <li>Right to access the categories of personal data being processed (as permitted by applicable law, including Minnesota’s privacy law)</li>
              <li>Right to obtain a list of the categories of third parties to which we have disclosed personal data (as permitted by applicable law, including California's and Delaware's privacy law)</li>
              <li>Right to obtain a list of specific third parties to which we have disclosed personal data (as permitted by applicable law, including Minnesota's and Oregon's privacy law)</li>
              <li>Right to review, understand, question, and correct how personal data has been profiled (as permitted by applicable law, including Minnesota’s privacy law)</li>
              <li>Right to limit use and disclosure of sensitive personal data (as permitted by applicable law, including California’s privacy law)</li>
              <li>Right to opt out of the collection of sensitive data and personal data collected through the operation of a voice or facial recognition feature (as permitted by applicable law, including Florida’s privacy law)</li>
            </ul>
            <h3>HOW TO EXERCISE YOUR RIGHTS</h3>
            <p>To exercise these rights, you can contact us by submitting a data subject access request, by emailing us at info@exchangetime.de, or by referring to the contact details at the bottom of this document.</p>
            <p>Under certain US state data protection laws, you can designate an authorized agent to make a request on your behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly authorized to act on your behalf in accordance with applicable laws.</p>
            <h3>REQUEST VERIFICATION</h3>
            <p>Upon receiving your request, we will need to verify your identity to determine you are the same person about whom we have the information in our system. We will only use personal information provided in your request to verify your identity or authority to make the request. However, if we cannot verify your identity from the information already maintained by us, we may request that you provide additional information for the purposes of verifying your identity and for security or fraud-prevention purposes.</p>
            <p>If you submit the request through an authorized agent, we may need to collect additional information to verify your identity before processing your request and the agent will need to provide a written and signed permission from you to submit such request on your behalf.</p>
            <h3>APPEALS</h3>
            <p>Under certain US state data protection laws, if we decline to take action regarding your request, you may appeal our decision by emailing us at info@exchangetime.de. We will inform you in writing of any action taken or not taken in response to the appeal, including a written explanation of the reasons for the decisions. If your appeal is denied, you may submit a complaint to your state attorney general.</p>
            <h3>CALIFORNIA "SHINE THE LIGHT" LAW</h3>
            <p>California Civil Code Section 1798.83, also known as the "Shine The Light" law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?"</p>
            <h2>13. DO WE MAKE UPDATES TO THIS NOTICE?</h2>
            <p><b>In Short:</b> Yes, we will update this notice as necessary to stay compliant with relevant laws.</p>
            <p>We may update this Privacy Notice from time to time. The updated version will be indicated by an updated "Revised" date at the top of this Privacy Notice. If we make material changes to this Privacy Notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting your information.</p>
            <h2>14. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>
            <p>If you have questions or comments about this notice, you may email us at <a href="mailto:info@exchangetime.de" className="underline">info@exchangetime.de</a> or contact us by post at:</p>
            <address className="not-italic">
              Exchange Time<br />
              Schluchseestraße 65<br />
              Berlin, Germany 13469<br />
              Germany
            </address>
            <h2>15. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</h2>
            <p>Based on the applicable laws of your country or state of residence in the US, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. To request to review, update, or delete your personal information, please fill out and submit a data subject access request.</p>
          </div>
        );
      } else if (href === "/settings/terms-of-service") {
        title = "Terms of Service";
        description = (
          <div className="prose prose-neutral dark:prose-invert px-1">
            <h2>1. ACCEPTANCE OF TERMS</h2>
            <p>By accessing and using Exchange Time, you accept and agree to be bound by the terms and provisions of this agreement.</p>
            <h2>2. USE LICENSE</h2>
            <p>Permission is granted to temporarily access Exchange Time for personal, non-commercial use only.</p>
            <h2>3. DISCLAIMER</h2>
            <p>The information provided on Exchange Time is for general informational purposes only. All information is provided in good faith, however we make no representation or warranty of any kind.</p>
            <h2>4. TRADING RISKS</h2>
            <p>Trading financial instruments involves high risks including the risk of losing some, or all, of your investment amount.</p>
            <h2>5. DATA ACCURACY</h2>
            <p>While we strive to provide accurate and timely information, there may be inadvertent technical or factual inaccuracies and typographical errors.</p>
            <h2>6. SERVICE MODIFICATIONS</h2>
            <p>Exchange Time reserves the right to modify or discontinue, temporarily or permanently, the service with or without notice.</p>
            <h2>7. USER OBLIGATIONS</h2>
            <ul>
              <li>You must not misuse the service</li>
              <li>You must not use the service for illegal purposes</li>
              <li>You must not attempt to gain unauthorized access</li>
            </ul>
            <h2>8. CONTACT</h2>
            <p>For questions about these Terms of Service, please contact us at <a href="mailto:info@exchangetime.de" className="underline">info@exchangetime.de</a></p>
          </div>
        );
      } else if (href === "/settings/contact") {
        title = "Contact";
        description = (
          <>
            If you have any questions, feedback, or need support, please contact us at <a href="mailto:support@example.com" className="underline">support@example.com</a>.<br /><br />
            We appreciate your interest and will respond as soon as possible.
          </>
        );
      }
      return (
        <Dialog>
          <DialogTrigger asChild>
            <button
              className="flex items-center px-3 py-2 text-sm rounded-md transition-colors text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23] w-full text-left"
            >
              <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
              {children}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
    }
    // Default nav item
    return (
      <a
        href={href}
        className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors w-full text-left
          ${currentTheme === "dark"
            ? "text-gray-200 hover:text-white hover:bg-[#23232a]"
            : "text-gray-800 hover:text-black hover:bg-gray-100"}
        `}
      >
        <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
        {children}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-lg bg-white dark:bg-[#0F0F12] shadow-md"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>
      <nav
        className={`
          fixed inset-y-0 left-0 z-[70] w-64
          ${currentTheme === "dark" ? "bg-[#0F0F12] border-[#1F1F23]" : "bg-white border-gray-200"}
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:w-64 border-r
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Sidebar navigation"
      >
        {/* Close button only on mobile and only when sidebar is open */}
        {isMobileMenuOpen && (
          <button
            type="button"
            className="absolute top-[0.875rem] right-4 z-[80] p-2 rounded-lg shadow-md lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close sidebar"
            style={{ background: 'transparent' }}
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        )}
        <div className="h-full flex flex-col">
          <Link
            href="https://exchangetime.de/"
            target="_blank"
            rel="noopener noreferrer"
            className="h-16 px-6 flex items-center border-b border-gray-200 dark:border-[#1F1F23]"
          >
            <div className="flex items-center gap-3">
              {/* Responsive Globe Icon je nach Theme */}
              <Globe
                className={`w-7 h-7 align-middle ${currentTheme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}
                style={{ marginTop: '-2px' }}
                stroke={currentTheme === 'dark' ? '#fff' : '#0F172A'}
                fill="none"
              />
              <span className="text-lg font-semibold hover:cursor-pointer text-gray-900 dark:text-white align-middle" style={{ lineHeight: '28px' }}>
                Exchange Time
              </span>
            </div>
          </Link>

          <div className="flex-1 overflow-y-auto py-4 px-4">
            <div className="space-y-6">
              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Market Overview
                </div>
                <div className="space-y-1">
                  {/* Dashboard Button entfernt */}
                  <ModuleButton module="StockAnalysis" icon={BarChart2} label="Stock Analysis" />
                  <ModuleButton module="ExchangeTimes" icon={Building2} label="Exchange Times" />
                  <ModuleButton module="MarketSummary" icon={Folder} label="Market Summary" />
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Trading Tools
                </div>
                <div className="space-y-1">
                  <ModuleButton module="BacktestTool" icon={Wallet} label="Backtest Tool" />
                  <ModuleButton module="PortfolioTracker" icon={CreditCard} label="Portfolio Tracker" />
                  <ModuleButton module="CurrencyConverter" icon={DollarSign} label="Currency Converter" />
                  <ModuleButton module="CompoundInterest" icon={Receipt} label="Compound Interest" />
                  <ModuleButton module="PersonalBudget" icon={Folder} label="Personal Budget" />
                  <ModuleButton module="FearGreedIndex" icon={Gauge} label="Fear & Greed Index" />
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Market Data
                </div>
                <div className="space-y-1">
                  <ModuleButton module="InsiderTrades" icon={Users2} label="Insider Trades" />
                  <ModuleButton module="EarningsCalendar" icon={CalendarDays} label="Earnings Calendar" />
                  <ModuleButton module="HolidayCalendar" icon={CupSoda} label="Holiday Calendar" />
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 border-t border-gray-200 dark:border-[#1F1F23]">
            <div className="mt-0">
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Help & Legal
              </div>
              <div className="space-y-1">
                <SimpleNavItem href="/settings/about" icon={HelpCircle}>About</SimpleNavItem>
                <SimpleNavItem href="/settings/mission" icon={HelpCircle}>Our Mission</SimpleNavItem>
                <SimpleNavItem href="/settings/privacy-policy" icon={HelpCircle}>Privacy Policy</SimpleNavItem>
                <SimpleNavItem href="/settings/terms-of-service" icon={HelpCircle}>Terms of Service</SimpleNavItem>
                <SimpleNavItem href="/settings/contact" icon={HelpCircle}>Contact</SimpleNavItem>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[65] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
