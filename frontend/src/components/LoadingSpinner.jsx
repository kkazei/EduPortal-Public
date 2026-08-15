import { motion } from "framer-motion";
import React from 'react';

const LoadingSpinner = ({ size = 'md', text = 'Loading...', fullScreen = false, minimal = false }) => {
	const sizeClasses = {
		sm: 'h-8 w-8 border-2',
		md: 'h-12 w-12 border-4',
		lg: 'h-16 w-16 border-4'
	};

	const Spinner = () => (
		<div className="flex flex-col items-center justify-center gap-4">
			<div className="relative">
				<motion.div
					className={`${sizeClasses[size]} border-t-primary-600 border-primary-200 rounded-full`}
					animate={{ rotate: 360 }}
					transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
				/>
				<div className="absolute inset-0 rounded-full bg-primary-500/10 blur-sm animate-pulse"></div>
			</div>
			{text && !minimal && (
				<p className="text-gray-600 font-medium text-sm animate-pulse">{text}</p>
			)}
		</div>
	);

	if (fullScreen) {
		return (
			<div className='min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center relative overflow-hidden'>
				<Spinner />
			</div>
		);
	}

	return <Spinner />;
};

export default LoadingSpinner;