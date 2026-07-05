import { useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProduct,
  getProductStock,
  updateProduct,
  uploadProductImage,
  setPrimaryProductImage,
  deleteProductImage,
} from '../api/products'
import { listCategories } from '../api/catalog'
import { apiErrorMessage } from '../api/client'
import { toastSuccess, toastError, confirmAction } from '../lib/toast'
import { useAuth } from '../context/AuthContext'
import { Package, Barcode, Tag, Layers, Ruler, Boxes, AlertTriangle, ImagePlus, Warehouse } from 'lucide-react'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import FormField, { inputClass, selectClass } from '../components/ui/FormField'

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5 text-gray-500">
        <Icon size={16} className="text-gray-400 shrink-0" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-gray-800 text-right">{children}</span>
    </div>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  const canManage = hasRole('SYSTEM_ADMIN', 'HQ_STORE_KEEPER')

  const { data: product, isLoading } = useQuery({ queryKey: ['product', id], queryFn: () => getProduct(id) })
  const { data: stock } = useQuery({ queryKey: ['product-stock', id], queryFn: () => getProductStock(id) })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => listCategories() })

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)

  const invalidateProduct = () => queryClient.invalidateQueries({ queryKey: ['product', id] })

  const updateMutation = useMutation({
    mutationFn: (body) => updateProduct(id, body),
    onSuccess: () => {
      toastSuccess('ບັນທຶກແລ້ວ')
      invalidateProduct()
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setEditing(false)
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, isPrimary }) => uploadProductImage(id, file, isPrimary),
    onSuccess: () => {
      toastSuccess('ອັບໂຫລດຮູບແລ້ວ')
      invalidateProduct()
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  })

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId) => setPrimaryProductImage(id, imageId),
    onSuccess: () => {
      toastSuccess('ຕັ້ງເປັນຮູບຫຼັກແລ້ວ')
      invalidateProduct()
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  })

  const deleteImageMutation = useMutation({
    mutationFn: (imageId) => deleteProductImage(id, imageId),
    onSuccess: () => {
      toastSuccess('ລຶບຮູບແລ້ວ')
      invalidateProduct()
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  })

  const startEdit = () => {
    setForm({
      sku: product.sku,
      barcode: product.barcode || '',
      nameLo: product.name_lo,
      nameCn: product.name_cn || '',
      modelNo: product.model_no || '',
      size: product.size || '',
      categoryId: product.category_id || '',
      unitLo: product.unit_lo,
      reorderPoint: product.reorder_point ?? 0,
      isActive: !!product.is_active,
    })
    setEditing(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    updateMutation.mutate({
      ...form,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      reorderPoint: Number(form.reorderPoint) || 0,
    })
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadMutation.mutate({ file, isPrimary: !product.images?.length })
    e.target.value = ''
  }

  const handleDeleteImage = async (imageId) => {
    const result = await confirmAction({ title: 'ລຶບຮູບນີ້?' })
    if (result.isConfirmed) deleteImageMutation.mutate(imageId)
  }

  if (isLoading || !product) return <Spinner />

  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0]

  return (
    <div>
      <Link to="/products" className="text-sm text-blue-600 hover:underline">
        &larr; ກັບໄປລາຍການສິນຄ້າ
      </Link>

      <div className="flex items-center justify-between mt-3 mb-6">
        <div className="flex items-center gap-4">
          {primaryImage ? (
            <img src={primaryImage.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Package size={26} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-800">{product.name_lo}</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  product.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {product.is_active ? 'ໃຊ້ງານ' : 'ປິດໃຊ້ງານ'}
              </span>
            </div>
            <div className="text-sm text-gray-400 font-mono mt-0.5">{product.sku}</div>
          </div>
        </div>
        {canManage && !editing && <Button onClick={startEdit}>ແກ້ໄຂຂໍ້ມູນ</Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          {editing ? (
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-x-4">
              <FormField label="SKU">
                <input
                  className={inputClass}
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="ບາໂຄດ">
                <input
                  className={inputClass}
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                />
              </FormField>
              <FormField label="ຊື່ສິນຄ້າ (ລາວ)">
                <input
                  className={inputClass}
                  value={form.nameLo}
                  onChange={(e) => setForm({ ...form, nameLo: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="ຊື່ສິນຄ້າ (ຈີນ)">
                <input
                  className={inputClass}
                  value={form.nameCn}
                  onChange={(e) => setForm({ ...form, nameCn: e.target.value })}
                />
              </FormField>
              <FormField label="ຮຸ່ນ/Model">
                <input
                  className={inputClass}
                  value={form.modelNo}
                  onChange={(e) => setForm({ ...form, modelNo: e.target.value })}
                />
              </FormField>
              <FormField label="ຂະໜາດ">
                <input
                  className={inputClass}
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                />
              </FormField>
              <FormField label="ໝວດໝູ່">
                <select
                  className={selectClass}
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">-- ບໍ່ລະບຸ --</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_lo}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="ໜ່ວຍ">
                <input
                  className={inputClass}
                  value={form.unitLo}
                  onChange={(e) => setForm({ ...form, unitLo: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="ຈຳນວນເຕືອນສິນຄ້າໃກ້ໝົດ">
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={form.reorderPoint}
                  onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
                />
              </FormField>
              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                ກຳລັງໃຊ້ງານ
              </label>
              <div className="col-span-2 flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  ຍົກເລີກ
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  ບັນທຶກ
                </Button>
              </div>
            </form>
          ) : (
            <div className="divide-y divide-gray-100">
              <InfoRow icon={Barcode} label="ບາໂຄດ">
                {product.barcode || '-'}
              </InfoRow>
              <InfoRow icon={Tag} label="ຊື່ (ຈີນ)">
                {product.name_cn || '-'}
              </InfoRow>
              <InfoRow icon={Layers} label="ຮຸ່ນ/Model">
                {product.model_no || '-'}
              </InfoRow>
              <InfoRow icon={Ruler} label="ຂະໜາດ">
                {product.size || '-'}
              </InfoRow>
              <InfoRow icon={Boxes} label="ໝວດໝູ່">
                {product.category_name || '-'}
              </InfoRow>
              <InfoRow icon={Package} label="ໜ່ວຍ">
                {product.unit_lo}
              </InfoRow>
              <InfoRow icon={AlertTriangle} label="ຈຳນວນເຕືອນສິນຄ້າໃກ້ໝົດ">
                {product.reorder_point}
              </InfoRow>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">ຮູບພາບ</h3>
            {canManage && (
              <>
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
                  + ອັບໂຫລດ
                </Button>
              </>
            )}
          </div>

          {product.images?.length ? (
            <div className="grid grid-cols-3 gap-2">
              {product.images.map((img) => (
                <div key={img.id} className="relative group">
                  <img src={img.image_url} alt="" className="w-full aspect-square object-cover rounded-lg border border-gray-100" />
                  {img.is_primary && (
                    <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                      ຫຼັກ
                    </span>
                  )}
                  {canManage && (
                    <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                      {!img.is_primary && (
                        <button
                          onClick={() => setPrimaryMutation.mutate(img.id)}
                          className="text-white text-xs bg-blue-600 rounded px-1.5 py-0.5"
                        >
                          ຕັ້ງເປັນຫຼັກ
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="text-white text-xs bg-red-600 rounded px-1.5 py-0.5"
                      >
                        ລຶບ
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => canManage && fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/40 transition-colors"
            >
              <ImagePlus size={28} strokeWidth={1.5} />
              <span className="text-sm">ຍັງບໍ່ມີຮູບພາບ</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mt-6">
        <h3 className="font-semibold text-gray-700 mb-3">ສະຕັອກຄົງເຫຼືອແຍກຕາມຄັງ</h3>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-left border-b">
            <tr>
              <th className="py-2">ຄັງ</th>
              <th className="py-2">ຈຳນວນຄົງເຫຼືອ</th>
              <th className="py-2">ຕົ້ນທຶນສະເລ່ຍ/ໜ່ວຍ (LAK)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stock?.map((s) => (
              <tr key={s.warehouse_id}>
                <td className="py-2">{s.warehouse_name}</td>
                <td className="py-2">
                  {s.quantity} {product.unit_lo}
                </td>
                <td className="py-2">{Number(s.avg_unit_value_lak).toLocaleString()}</td>
              </tr>
            ))}
            {!stock?.length && (
              <tr>
                <td colSpan={3} className="py-10 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <Warehouse size={24} strokeWidth={1.5} />
                    <span>ຍັງບໍ່ມີສະຕັອກຂອງສິນຄ້ານີ້</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
