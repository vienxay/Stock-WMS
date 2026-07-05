import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSettings,
  updateSettings,
  uploadLogo,
  uploadLoginBackground,
} from "../../api/settings";
import { apiErrorMessage } from "../../api/client";
import { toastSuccess, toastError } from "../../lib/toast";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import FormField, { inputClass } from "../../components/ui/FormField";

export default function BrandingTab() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const [companyName, setCompanyName] = useState("");
  const [companyNameLo, setCompanyNameLo] = useState("");
  const logoInputRef = useRef(null);
  const backgroundInputRef = useRef(null);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name);
      setCompanyNameLo(settings.company_name_lo || "");
    }
  }, [settings]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["settings"] });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toastSuccess("ບັນທຶກແລ້ວ");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const logoMutation = useMutation({
    mutationFn: uploadLogo,
    onSuccess: () => {
      toastSuccess("ອັບໂຫລດໂລໂກ້ແລ້ວ");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const backgroundMutation = useMutation({
    mutationFn: uploadLoginBackground,
    onSuccess: () => {
      toastSuccess("ອັບໂຫລດພາບພື້ນຫຼັງແລ້ວ");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleSaveName = (e) => {
    e.preventDefault();
    updateMutation.mutate({ companyName, companyNameLo });
  };

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) logoMutation.mutate(file);
  };

  const handleBackgroundFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) backgroundMutation.mutate(file);
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="max-w-xl space-y-8">
      <form onSubmit={handleSaveName}>
        <FormField label="ຊື່ບໍລິສັດ/ອົງກອນ (ຄ່າເລີ່ມຕົ້ນ)">
          <input
            className={inputClass}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </FormField>
        <FormField label="ຊື່ບໍລິສັດ/ອົງກອນ (ພາສາລາວ) — ຖ້າໃສ່ໄວ້ຈະໃຊ້ແທນຊື່ຂ້າງເທິງ">
          <input
            className={inputClass}
            value={companyNameLo}
            onChange={(e) => setCompanyNameLo(e.target.value)}
            placeholder="ຕົວຢ່າງ: ບໍລິສັດ ຊາໄບດີ ຈຳກັດ"
          />
        </FormField>
        <p className="text-xs text-gray-400 -mt-2 mb-4">
          ຊື່ທັງສອງນີ້ຈະສະແດງໃນໜ້າ login ແລະ sidebar
        </p>
        <Button type="submit" disabled={updateMutation.isPending}>
          ບັນທຶກຊື່
        </Button>
      </form>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ໂລໂກ້
        </label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt="logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-xs text-gray-400">ບໍ່ມີ</span>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => logoInputRef.current?.click()}
            disabled={logoMutation.isPending}
          >
            {logoMutation.isPending ? "ກຳລັງອັບໂຫລດ..." : "ອັບໂຫລດໂລໂກ້"}
          </Button>
          <input
            ref={logoInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.svg"
            className="hidden"
            onChange={handleLogoFile}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ພາບພື້ນຫຼັງໜ້າ login
        </label>
        <div className="flex items-center gap-4">
          <div className="w-32 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            {settings?.login_background_url ? (
              <img
                src={settings.login_background_url}
                alt="background"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-gray-400">ບໍ່ມີ (ໃຊ້ຄ່າເລີ່ມຕົ້ນ)</span>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => backgroundInputRef.current?.click()}
            disabled={backgroundMutation.isPending}
          >
            {backgroundMutation.isPending
              ? "ກຳລັງອັບໂຫລດ..."
              : "ອັບໂຫລດພາບພື້ນຫຼັງ"}
          </Button>
          <input
            ref={backgroundInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleBackgroundFile}
          />
        </div>
      </div>
    </div>
  );
}
