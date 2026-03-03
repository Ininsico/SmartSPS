import React from 'react';
import { motion } from 'framer-motion';
import { Home, AlertCircle } from 'lucide-react';
import PremiumButton from './PremiumButton';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white relative overflow-hidden font-montserrat">
      {/* Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)]" style={{ backgroundSize: '32px 32px' }} />

      <div className="text-center max-w-lg p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8"
        >
          <h1 className="text-[12rem] font-black leading-none tracking-[-0.08em] select-none text-black opacity-10">
            404
          </h1>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-24 h-24 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-2xl">
              <AlertCircle size={48} className="text-premium-danger" strokeWidth={1.5} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 mb-12"
        >
          <h2 className="text-4xl font-black tracking-tight text-black">Lost in space?</h2>
          <p className="text-lg font-medium text-gray-500 leading-relaxed">
            The page you are looking for doesn't exist or has been moved to another dimension.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <PremiumButton
            variant="primary"
            icon={Home}
            onClick={() => window.location.href = '/'}
            className="h-14 px-10"
          >
            Go back home
          </PremiumButton>
        </motion.div>
      </div>

      {/* Soft decorative blur */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-premium-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-premium-danger/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

export default NotFoundPage;
