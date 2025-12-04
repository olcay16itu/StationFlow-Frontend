import React, { useState, useRef } from 'react';
import { UserCheck, ArrowRight } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface AuthViewProps {
    onCancel: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onCancel }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const { t } = useLanguage();
    const { login, register } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Client-side Validation
        if (!isLogin) {
            // Username validation
            if (username.length < 3 || username.length > 20) {
                setError(t('username') + " 3-20 karakter olmalıdır.");
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setError("Geçerli bir e-posta adresi giriniz.");
                return;
            }
            if (email.length > 50) {
                setError("E-posta en fazla 50 karakter olabilir.");
                return;
            }

            // Password validation
            if (password.length < 6 || password.length > 40) {
                setError(t('password') + " 6-40 karakter olmalıdır.");
                return;
            }

            if (!recaptchaToken) {
                setError(t('robotCheck'));
                return;
            }
        } else {
            // Basic login validation
            if (!username || !password) {
                setError(t('username') + " ve " + t('password') + " zorunludur.");
                return;
            }
        }

        setLoading(true);
        try {
            if (isLogin) {
                await login(username, password);
                onCancel(); // Close modal on success
            } else {
                await register(username, email, password, recaptchaToken!);
                alert("Kayıt başarılı! Lütfen giriş yapın.");
                setIsLogin(true);
                setRecaptchaToken(null);
                recaptchaRef.current?.reset();
            }
        } catch (err: any) {
            setError(err.message || "İşlem başarısız");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[90%] sm:w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
                <div className="bg-blue-600 dark:bg-blue-700 p-6 text-white text-center">
                    <UserCheck size={48} className="mx-auto mb-2 opacity-90" />
                    <h2 className="text-2xl font-bold">{isLogin ? t('welcome') : t('createAccount')}</h2>
                    <p className="text-blue-100 text-sm">{t('loginDesc')}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-100 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('username')}</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            placeholder="kullaniciadi"
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('email')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                placeholder="ornek@email.com"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('password')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div className="flex justify-center transform scale-90 sm:scale-100 origin-center">
                            <ReCAPTCHA
                                ref={recaptchaRef}
                                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                                onChange={(token) => setRecaptchaToken(token)}
                                theme="light" // ReCAPTCHA dark theme support can be added if needed
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? t('processing') : (isLogin ? t('login') : t('signup'))}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center text-sm gap-3 sm:gap-0">
                    <button onClick={onCancel} className="px-2 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                        {t('cancel')}
                    </button>
                    <button onClick={() => setIsLogin(!isLogin)} className="px-2 py-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                        {isLogin ? t('noAccount') : t('haveAccount')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthView;