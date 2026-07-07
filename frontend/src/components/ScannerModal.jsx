import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ScanLine } from "lucide-react";
import { lookupProduct } from "../api/products";
import { apiErrorMessage } from "../api/client";
import { toastError } from "../lib/toast";
import Modal from "./ui/Modal";

const SCANNER_REGION_ID = "product-scanner-region";

// ໃຊ້ library ດຽວອ່ານໄດ້ທັງ QR ແລະ barcode ທົ່ວໄປ (Code128/EAN/UPC ...) ຫຼັງຖອດລະຫັດແລ້ວຄົ້ນຫາສິນຄ້າແບບກົງເປົ໊ະ
export default function ScannerModal({ open, onClose }) {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    const scanner = new Html5QrcodeScanner(
      SCANNER_REGION_ID,
      { fps: 10, qrbox: 250 },
      false,
    );
    scannerRef.current = scanner;

    const handleSuccess = async (decodedText) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const product = await lookupProduct(decodedText);
        await scanner.clear().catch(() => {});
        onClose();
        navigate(`/products/${product.id}`);
      } catch (err) {
        toastError(apiErrorMessage(err));
        busyRef.current = false;
      }
    };

    scanner.render(handleSuccess, () => {});

    return () => {
      scanner.clear().catch(() => {});
      scannerRef.current = null;
    };
  }, [open, navigate, onClose]);

  return (
    <Modal
      open={open}
      title="ສະແກນ Barcode / QR ສິນຄ້າ"
      icon={ScanLine}
      onClose={onClose}
    >
      <div id={SCANNER_REGION_ID} />
    </Modal>
  );
}
