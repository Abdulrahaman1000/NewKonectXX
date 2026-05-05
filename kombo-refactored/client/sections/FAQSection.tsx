import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { FAQ } from '@/types/faq';

interface Props {
  faqs: FAQ[];
  whatsappLink: string;
}

export function FAQSection({ faqs, whatsappLink }: Props) {
  if (faqs.length === 0) return null;

  return (
    <section className="section-padding py-20" style={{ background: 'rgba(0,0,0,0.2)' }}>
      <div className="container-premium">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-primary/70 font-bold mb-3">Got questions?</p>
          <h2 className="text-3xl md:text-4xl font-black mb-3 text-white">Frequently Asked Questions</h2>
          <p className="text-white/45 max-w-md mx-auto text-[15px]">Everything you need to know before ordering</p>
        </div>
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border border-white/8 rounded-xl px-0 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.015)' }}
              >
                <AccordionTrigger className="hover:no-underline px-6 py-4 text-left hover:bg-white/5 transition-colors">
                  <span className="font-semibold text-[14px] text-white/90 pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-[13px] text-white/50 px-6 pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="text-center text-sm text-white/30 mt-8">
            Still have questions?{' '}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary/70 hover:text-primary transition-colors underline underline-offset-2"
            >
              Chat with us on WhatsApp
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
