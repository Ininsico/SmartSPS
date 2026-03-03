import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw, Home, XCircle } from 'lucide-react';
import PremiumButton from './PremiumButton';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Critical UI Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full flex items-center justify-center bg-white p-6 font-montserrat">
                    <div className="max-w-xl w-full text-center p-12 sm:p-20 rounded-[48px] bg-white border border-gray-100 shadow-2xl relative overflow-hidden">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="inline-flex mb-8"
                        >
                            <div className="w-24 h-24 rounded-full bg-premium-danger/5 flex items-center justify-center">
                                <XCircle size={64} className="text-premium-danger" strokeWidth={1} />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mb-12"
                        >
                            <h1 className="text-4xl font-black tracking-tight mb-4">Something went wrong</h1>
                            <p className="text-lg text-gray-500 font-medium leading-relaxed">
                                We encountered an unexpected error. Don't worry, your connection is still safe.
                                Try reloading the page to resolve the issue.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-wrap gap-4 justify-center"
                        >
                            <PremiumButton
                                variant="primary"
                                icon={RefreshCcw}
                                onClick={() => window.location.reload()}
                                className="h-14 px-10"
                            >
                                Reload Page
                            </PremiumButton>
                            <PremiumButton
                                variant="secondary"
                                icon={Home}
                                onClick={() => window.location.href = '/'}
                                className="h-14 px-10"
                            >
                                Go Home
                            </PremiumButton>
                        </motion.div>

                        {/* Soft decorative blur */}
                        <div className="absolute -top-24 -left-24 w-96 h-96 bg-premium-danger/5 rounded-full blur-3xl pointer-events-none" />
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
