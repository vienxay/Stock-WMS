import { useState } from 'react'

export default function Tabs({ tabs }) {
  const [active, setActive] = useState(tabs[0].key)
  const ActiveComponent = tabs.find((t) => t.key === active)?.component

  return (
    <div>
      <div className="inline-flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              active === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="animate-fade-in">{ActiveComponent}</div>
    </div>
  )
}
