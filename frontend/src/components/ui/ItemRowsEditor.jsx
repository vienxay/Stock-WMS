import { Plus, Trash2 } from "lucide-react";
import { selectClass, inputClass } from "./FormField";

// ตารางกรอกรายการสินค้าแบบไดนามิก ใช้ร่วมกันใน stock receipts / branch requests / requisitions
// priceField: { key, label } ใส่เฉพาะตอนต้องกรอกราคาต่อหน่วยด้วย (เช่น รับสินค้าเข้า)
export default function ItemRowsEditor({
  title = "ລາຍການສິນຄ້າ",
  items,
  products,
  onUpdate,
  onAdd,
  onRemove,
  quantityField,
  quantityLabel = "ຈຳນວນ",
  priceField,
}) {
  // สินค้า + จำนวน (+ ราคาถ้ามี) + ปุ่มลบ ต้องรวมกันให้ครบ 12 คอลัมน์เสมอ ไม่งั้นปุ่มลบจะล้นไปขึ้นบรรทัดใหม่
  const gridCols = "grid-cols-12";
  const productSpan = priceField ? "col-span-6" : "col-span-8";
  const qtySpan = priceField ? "col-span-2" : "col-span-3";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm text-gray-700">{title}</h4>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <Plus size={16} />
          ເພີ່ມລາຍການ
        </button>
      </div>

      <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-3">
        <div
          className={`grid ${gridCols} gap-2 px-1 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide`}
        >
          <div className={productSpan}>ສິນຄ້າ</div>
          <div className={qtySpan}>{quantityLabel}</div>
          {priceField && <div className="col-span-3">{priceField.label}</div>}
          <div className="col-span-1" />
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className={`grid ${gridCols} gap-2 items-center`}>
              <select
                className={`${selectClass} ${productSpan} bg-white`}
                value={item.productId}
                onChange={(e) => onUpdate(idx, { productId: e.target.value })}
                required
              >
                <option value="">-- ເລືອກສິນຄ້າ --</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name_lo}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="1"
                className={`${inputClass} ${qtySpan} bg-white`}
                placeholder="0"
                value={item[quantityField]}
                onChange={(e) =>
                  onUpdate(idx, { [quantityField]: e.target.value })
                }
                required
              />
              {priceField && (
                <input
                  type="number"
                  step="1"
                  className={`${inputClass} col-span-3 bg-white`}
                  placeholder="0"
                  value={item[priceField.key]}
                  onChange={(e) =>
                    onUpdate(idx, { [priceField.key]: e.target.value })
                  }
                  required
                />
              )}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                disabled={items.length === 1}
                title="ລຶບລາຍການນີ້"
                className="col-span-1 justify-self-center w-8 h-8 flex items-center justify-center rounded-lg text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-red-50 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
