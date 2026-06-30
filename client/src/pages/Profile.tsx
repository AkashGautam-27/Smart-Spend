import { useState, useRef, DragEvent, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Phone,
  Mail,
  Upload,
  Check,
  AlertCircle,
  Camera,
  Save,
  ShieldCheck,
  UserCheck,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_AVATARS = [
  { name: 'Sunset Glow', class: 'bg-gradient-to-tr from-pink-500 to-amber-400' },
  { name: 'Ocean Breeze', class: 'bg-gradient-to-tr from-cyan-500 to-blue-600' },
  { name: 'Cyberpunk', class: 'bg-gradient-to-tr from-purple-600 to-fuchsia-500' },
  { name: 'Emerald', class: 'bg-gradient-to-tr from-emerald-500 to-teal-600' },
  { name: 'Royal Velvet', class: 'bg-gradient-to-tr from-indigo-650 to-purple-500' },
  { name: 'Tangerine', class: 'bg-gradient-to-tr from-amber-500 to-rose-500' },
];

export default function Profile() {
  const { authState, updateProfile } = useAuth();
  const currentUser = authState.user;

  // Form states
  const [name, setName] = useState(currentUser?.name || '');
  const [mobile, setMobile] = useState(currentUser?.mobile || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  
  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (PNG, JPG, WebP, etc.)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setAvatar(e.target.result);
        setErrorMsg(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to process image file');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const selectPreset = (presetClass: string) => {
    setAvatar(presetClass);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Username/Name cannot be empty');
      setIsSaving(false);
      return;
    }

    try {
      await updateProfile(name, avatar, mobile);
      setSuccessMsg('Your profile has been updated successfully!');
      
      // Auto dismiss success message after 4 seconds
      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while updating your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to render user's current avatar
  const renderAvatarPreview = (className: string) => {
    const initials = name ? name.charAt(0).toUpperCase() : 'U';

    if (!avatar) {
      return (
        <div className={`w-full h-full rounded-full flex items-center justify-center bg-indigo-600 text-white font-extrabold ${className}`}>
          {initials}
        </div>
      );
    }

    if (avatar.startsWith('bg-gradient-')) {
      return (
        <div className={`w-full h-full rounded-full flex items-center justify-center text-white font-extrabold ${avatar} ${className}`}>
          {initials}
        </div>
      );
    }

    return (
      <img
        src={avatar}
        alt="Avatar Preview"
        referrerPolicy="no-referrer"
        className={`w-full h-full rounded-full object-cover border-4 border-white dark:border-neutral-800 shadow-inner ${className}`}
      />
    );
  };

  return (
    <div id="profile_page_container" className="font-sans max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-950 dark:text-white tracking-tight">
            Account Profile
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            Manage your personal workspace identity, avatar icon, and contact information.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2.5 shadow-xs"
          >
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2.5 shadow-xs"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-500 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Card: Avatar Selection & drag and drop */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-900/60 rounded-2xl p-6 shadow-xs flex flex-col items-center">
            <h3 className="text-xs font-bold text-slate-800 dark:text-neutral-300 w-full mb-4">
              Profile Photo
            </h3>
            
            <div className="relative group w-28 h-28 mb-5">
              {renderAvatarPreview('text-4xl')}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                title="Upload custom image"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="text-center mb-6">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-full">
                {currentUser?.name}
              </h4>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {currentUser?.email}
              </p>
              <div className="inline-flex items-center gap-1 mt-2.5 px-2 py-0.5 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 rounded-full text-[9px] font-bold uppercase tracking-wider">
                {currentUser?.role === 'admin' ? (
                  <>
                    <ShieldCheck className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Administrator</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="h-3 w-3 text-emerald-650" />
                    <span>Verified Account</span>
                  </>
                )}
              </div>
            </div>

            {/* Custom file dropzone complying with file upload drag and drop */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-4 px-3 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-neutral-800 hover:border-indigo-500'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <Upload className={`h-5 w-5 mb-1.5 ${isDragging ? 'text-indigo-600' : 'text-slate-400'}`} />
              <p className="text-[10px] font-semibold text-slate-700 dark:text-neutral-300">
                Drag & drop or Click
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                PNG, JPG or WEBP (Max 2MB)
              </p>
            </div>
          </div>

          {/* Presets block */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-900/60 rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 dark:text-neutral-300 mb-3.5 flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
              <span>Or Choose a Preset Gradient</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AVATARS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectPreset(preset.class)}
                  className={`aspect-square rounded-xl relative transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer ${preset.class} ${
                    avatar === preset.class ? 'ring-2 ring-indigo-650 ring-offset-2 dark:ring-offset-neutral-950' : ''
                  }`}
                  title={preset.name}
                >
                  {avatar === preset.class && (
                    <div className="absolute inset-0 bg-black/25 rounded-xl flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Card: Fields and save */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-900/60 rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="text-xs font-bold text-slate-800 dark:text-neutral-300 border-b border-slate-100 dark:border-neutral-800 pb-3">
              Profile Details
            </h3>

            <div className="space-y-4">
              {/* Full Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="profile_name" className="text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>Full Name / Username</span>
                </label>
                <input
                  id="profile_name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-650 focus:border-indigo-650 dark:focus:ring-indigo-400"
                />
              </div>

              {/* Email (Read Only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-neutral-500 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  <span>Email Identity </span>
                </label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2 bg-slate-100/75 dark:bg-neutral-900/40 border border-slate-200/50 dark:border-neutral-800/50 rounded-xl text-xs text-slate-400 dark:text-neutral-500 cursor-not-allowed select-all"
                />
                <p className="text-[10px] text-slate-400 dark:text-neutral-500">
                  Your registered email address is used for secure logins and password recovery.
                </p>
              </div>

              {/* Mobile Number Input */}
              <div className="space-y-1.5">
                <label htmlFor="profile_mobile" className="text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>Mobile Number</span>
                </label>
                <input
                  id="profile_mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. +91 XXXXXXXXXX"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-650 focus:border-indigo-650 dark:focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 flex justify-end">
              <button
                id="profile_save_btn"
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
