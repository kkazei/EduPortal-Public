const Input = ({ icon: Icon, variant = 'light', ...props }) => {
	const isDark = variant === 'dark';
	
	return (
		<div className='relative mb-6'>
			{Icon && (
				<div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
					<Icon className={`size-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
				</div>
			)}
			<input
				{...props}
				className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2 rounded-lg border transition duration-200 ${
					isDark
						? 'bg-gray-800 bg-opacity-50 border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400'
						: 'bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400'
				} ${props.className || ''}`}
			/>
		</div>
	);
};
export default Input;