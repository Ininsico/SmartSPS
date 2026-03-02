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
                <div className="error-boundary-container">
                    <div className="error-card">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="error-icon"
                        >
                            <XCircle size={64} strokeWidth={1} />
                        </motion.div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="error-header"
                        >
                            <h1>Something went wrong</h1>
                            <p>We encountered an unexpected error while rendering this part of the application. Don't worry, your connection is still safe.</p>
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="error-actions-group"
                        >
                            <PremiumButton
                                variant="primary"
                                icon={RefreshCcw}
                                onClick={() => window.location.reload()}
                            >
                                Reload Page
                            </PremiumButton>
                            <PremiumButton
                                variant="secondary"
                                icon={Home}
                                onClick={() => window.location.href = '/'}
                            >
                                Go Home
                            </PremiumButton>
                        </motion.div>
                    </div>

                    <style dangerouslySetInnerHTML={{
                        __html: `
            .error-boundary-container {
              height: 100vh;
              width: 100vw;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #ffffff;
              color: #000;
              font-family: 'Montserrat', sans-serif;
              padding: 2rem;
            }

            .error-card {
              max-width: 480px;
              text-align: center;
              padding: 4rem;
              border-radius: 2.5rem;
              background: #fff;
              border: 1px solid rgba(0,0,0,0.06);
              box-shadow: 0 40px 100px -20px rgba(0,0,0,0.1);
            }

            .error-icon {
              margin-bottom: 2.5rem;
              display: inline-flex;
            }

            .error-header h1 {
              font-size: 2.25rem;
              font-weight: 800;
              letter-spacing: -1px;
              margin-bottom: 1rem;
            }

            .error-header p {
              color: #666;
              font-size: 1rem;
              line-height: 1.6;
              margin-bottom: 3.5rem;
              font-weight: 500;
            }

            .error-actions-group {
              display: flex;
              gap: 1.5rem;
              justify-content: center;
              flex-wrap: wrap;
            }
          `}} />
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
