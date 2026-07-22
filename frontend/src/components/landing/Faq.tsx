import { useState } from 'react'

interface FaqItem {
  question: string
  answer: string
}

interface Props {
  items: FaqItem[]
}

function Faq({ items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="faq-list">
      {items.map((item, index) => {
        const open = openIndex === index
        return (
          <div key={item.question} className={`faq-item${open ? ' open' : ''}`}>
            <button
              type="button"
              className="faq-question"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : index)}
            >
              <span>{item.question}</span>
              <span className="faq-marker" aria-hidden="true" />
            </button>
            <div className="faq-answer-wrap">
              <p className="faq-answer">{item.answer}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Faq
