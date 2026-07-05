import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Boxes } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";
import Button from "../components/ui/Button";
import { inputClass } from "../components/ui/FormField";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      const redirectTo = location.state?.from || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-sm animate-fade-in"
      >
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
          <Boxes size={24} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Stock WMS</h1>
        <p className="text-sm text-gray-500 mb-6">ລະບົບຄັງສິນຄ້າພາຍໃນອົງກອນ</p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          ຊື່ຜູ້ໃຊ້
        </label>
        <input
          className={`${inputClass} mb-4`}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          required
        />

        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          ລະຫັດຜ່ານ
        </label>
        <input
          type="password"
          className={`${inputClass} mb-6`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button
          type="submit"
          disabled={loading}
          className="w-full justify-center"
        >
          {loading ? "ກຳລັງເຂົ້າສູ່ລະບົບ..." : "ເຂົ້າສູ່ລະບົບ"}
        </Button>
      </form>
    </div>
  );
}
