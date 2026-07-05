import { useState } from "react";

export default function Tabs({ tabs }) {
  const [active, setActive] = useState(tabs[0].key);
  const ActiveComponent = tabs.find((t) => t.key === active)?.component;

  return (
    <div>
      <div className="flex gap-1 border-b mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              active === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {ActiveComponent}
    </div>
  );
}
