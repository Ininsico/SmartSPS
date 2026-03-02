import React from 'react';
import { motion } from 'framer-motion';
import { Home, AlertCircle, ArrowLeft } from 'lucide-react';
import PremiumButton from './PremiumButton';

const NotFoundPage = () => {
    return (
        <div className="error-container">
            <div className="error-content">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="error-visual"
                >
                    <h1 className="glitch-text" data-text="404">404</h1>
                    <div className="error-icon-wrapper">
                        <AlertCircle size={48} strokeWidth={1} />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="error-text"
                >
                    <h2>Lost in space?</h2>
                    <p>The page you are looking for doesn't exist or has been moved to another dimension.</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="error-actions"
                >
                    <PremiumButton
                        variant="primary"
                        icon={Home}
                        onClick={() => window.location.href = '/'}
                    >
                        Go back home
                    </PremiumButton>
                </motion.div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .error-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          background-image: radial-gradient(#00000005 1px, transparent 1px);
          background-size: 32px 32px;
          color: #000;
          font-family: 'Montserrat', sans-serif;
          overflow: hidden;
        }

        .error-content {
          text-align: center;
          max-width: 500px;
          padding: 2rem;
        }

        .error-visual {
          position: relative;
          margin-bottom: 2rem;
        }

        .glitch-text {
          font-size: 10rem;
          font-weight: 900;
          line-height: 1;
          margin: 0;
          letter-spacing: -10px;
          position: relative;
          color: #000;
        }

        .error-icon-wrapper {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #fff;
          padding: 1rem;
          border-radius: 50%;
          border: 1px solid #f0f0f0;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }

        .error-text h2 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          letter-spacing: -1px;
        }

        .error-text p {
          color: #666;
          font-size: 1.1rem;
          margin-bottom: 3rem;
          line-height: 1.6;
          font-weight: 500;
        }

        .error-actions {
          display: flex;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .glitch-text {
            font-size: 6rem;
          }
          .error-text h2 {
            font-size: 1.8rem;
          }
        }
      `}} />
        </div>
    );
};

export default NotFoundPage;
