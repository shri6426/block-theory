import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight, UserCheck, RefreshCw } from 'lucide-react';
import { BlockTheoryLogo } from '../../components/BlockTheoryLogo';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'pin' | 'password'>('pin');
  const [pin, setPin] = useState<string>('');
  const [username, setUsername] = useState<string>('cashier');
  const [password, setPassword] = useState<string>('cashier123');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const { loginPassword, loginPin } = useAuth();
  const { error, success } = useNotification();

  const handlePinSubmit = async (pinValue: string) => {
    if (pinValue.length !== 4) return;
    setSubmitting(true);
    const res = await loginPin(pinValue);
    setSubmitting(false);
    if (!res.success) {
      error('Authentication Error', res.error || 'Invalid PIN code');
      setPin('');
    } else {
      success('Welcome to BLOCK THEORY', 'Session started successfully');
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        handlePinSubmit(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    const res = await loginPassword(username, password);
    setSubmitting(false);
    if (!res.success) {
      error('Authentication Failed', res.error || 'Invalid credentials');
    } else {
      success('Welcome to BLOCK THEORY', 'Authenticated as ' + username);
    }
  };

  const fillQuickRole = (user: string, pass: string, quickPin: string) => {
    setUsername(user);
    setPassword(pass);
    if (mode === 'pin') {
      setPin(quickPin);
      handlePinSubmit(quickPin);
    }
  };

  return (
    <div className="h-screen w-screen flex bg-bt-bg overflow-hidden relative select-none">
      {/* Left Industrial Visual Branding */}
      <div className="hidden lg:flex w-5/12 bg-bt-charcoal text-white flex-col justify-between p-12 relative overflow-hidden border-r border-bt-charcoal">
        {/* Subtle mesh and geometric lines */}
        <div className="absolute inset-0 bg-mesh-pattern opacity-10 pointer-events-none" />
        <div className="absolute -right-24 -bottom-24 w-96 h-96 border-[32px] border-white/5 rounded-none pointer-events-none" />
        <div className="absolute top-1/3 -left-12 w-48 h-48 bg-bt-brick/20 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <BlockTheoryLogo size="lg" showSubtitle={false} className="text-white" />
          <div className="mt-8 border-l-2 border-bt-brick pl-4">
            <h2 className="text-2xl font-black font-mono tracking-wider uppercase text-white">
              SPECIALITY COFFEE CULTURE
            </h2>
            <p className="text-bt-concrete text-xs font-mono mt-2 leading-relaxed">
              Chennai Flagship • High-Throughput POS, Kitchen Routing & Inventory Engine.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="p-4 bg-white/5 border border-white/10 text-xs font-mono">
            <div className="text-bt-beige uppercase font-bold tracking-widest text-[10px]">
              COMMERCIAL OPERATING SYSTEM
            </div>
            <div className="mt-2 text-bt-concrete text-[11px] leading-relaxed">
              Designed for touch and high-speed tactile keyboard checkout. Guaranteed offline resilience with atomic transactions.
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
            <span>TERMINAL: POS-01 (ALWARPET)</span>
            <span className="text-emerald-400 font-bold">SQLITE WAL ONLINE</span>
          </div>
        </div>
      </div>

      {/* Right Login Pane */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-bt-bg">
        <div className="w-full max-w-md bg-white border-2 border-bt-charcoal p-8 shadow-2xl relative">
          <div className="mb-6 text-center">
            <h1 className="font-mono font-black text-2xl uppercase tracking-widest text-bt-charcoal">
              BLOCK THEORY
            </h1>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-bt-muted mt-1">
              CAFE OPERATING SYSTEM
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex border border-bt-border mb-6 font-mono text-xs">
            <button
              onClick={() => { setMode('pin'); setPin(''); }}
              className={`flex-1 py-2 font-bold tracking-wider uppercase transition-colors ${
                mode === 'pin' ? 'bg-bt-charcoal text-white' : 'bg-bt-bg text-bt-muted hover:text-bt-charcoal'
              }`}
            >
              PIN Login
            </button>
            <button
              onClick={() => setMode('password')}
              className={`flex-1 py-2 font-bold tracking-wider uppercase transition-colors ${
                mode === 'password' ? 'bg-bt-charcoal text-white' : 'bg-bt-bg text-bt-muted hover:text-bt-charcoal'
              }`}
            >
              Password Login
            </button>
          </div>

          {mode === 'pin' ? (
            <div className="flex flex-col items-center">
              {/* PIN Display */}
              <div className="flex items-center gap-3 mb-6">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`w-11 h-12 border-2 flex items-center justify-center font-mono text-xl font-bold transition-all ${
                      pin.length > i 
                        ? 'border-bt-brick bg-bt-brick/10 text-bt-brick' 
                        : 'border-bt-border bg-bt-bg text-transparent'
                    }`}
                  >
                    {pin.length > i ? '•' : ''}
                  </div>
                ))}
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    onClick={() => handleKeypadPress(num)}
                    disabled={submitting}
                    className="h-13 bg-bt-bg hover:bg-bt-charcoal hover:text-white border border-bt-border font-mono text-lg font-bold text-bt-charcoal transition-colors active:scale-95 flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setPin('')}
                  className="h-13 bg-bt-bg hover:bg-bt-border border border-bt-border font-mono text-xs font-bold text-bt-muted uppercase transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => handleKeypadPress('0')}
                  disabled={submitting}
                  className="h-13 bg-bt-bg hover:bg-bt-charcoal hover:text-white border border-bt-border font-mono text-lg font-bold text-bt-charcoal transition-colors active:scale-95 flex items-center justify-center"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  className="h-13 bg-bt-bg hover:bg-bt-border border border-bt-border font-mono text-xs font-bold text-bt-muted uppercase transition-colors"
                >
                  ⌫
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-bt-charcoal font-bold mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. admin or cashier"
                  className="w-full px-3 py-2 bg-bt-bg border border-bt-border font-mono text-sm focus:outline-none focus:border-bt-brick"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-bt-charcoal font-bold mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-bt-bg border border-bt-border font-mono text-sm focus:outline-none focus:border-bt-brick"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-bt-brick hover:bg-bt-brick-dark text-white font-mono text-xs uppercase font-bold tracking-widest transition-colors flex items-center justify-center gap-2 mt-4 shadow-sm"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-bt-border">
            <div className="text-[10px] font-mono uppercase tracking-wider text-bt-muted font-bold text-center mb-2.5">
              Quick Role Switch (Demo Mode)
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <button
                onClick={() => fillQuickRole('cashier', 'cashier123', '3333')}
                className="p-2 border border-bt-border bg-bt-bg hover:bg-bt-border text-left"
              >
                <div className="font-bold text-bt-charcoal">Cashier</div>
                <div className="text-[10px] text-bt-muted">PIN: 3333</div>
              </button>
              <button
                onClick={() => fillQuickRole('admin', 'admin123', '1111')}
                className="p-2 border border-bt-border bg-bt-bg hover:bg-bt-border text-left"
              >
                <div className="font-bold text-bt-brick">Owner</div>
                <div className="text-[10px] text-bt-muted">PIN: 1111</div>
              </button>
              <button
                onClick={() => fillQuickRole('manager', 'manager123', '2222')}
                className="p-2 border border-bt-border bg-bt-bg hover:bg-bt-border text-left"
              >
                <div className="font-bold text-bt-charcoal">Manager</div>
                <div className="text-[10px] text-bt-muted">PIN: 2222</div>
              </button>
              <button
                onClick={() => fillQuickRole('kitchen', 'kitchen123', '4444')}
                className="p-2 border border-bt-border bg-bt-bg hover:bg-bt-border text-left"
              >
                <div className="font-bold text-bt-charcoal">Kitchen</div>
                <div className="text-[10px] text-bt-muted">PIN: 4444</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

