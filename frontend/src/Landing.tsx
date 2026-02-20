import React from 'react';
import { MicrophoneIcon, ClockIcon } from '@heroicons/react/24/solid';
import './HomePage.css';

interface Props {
    onRecordClick: () => void;
    onHistoryClick?: () => void;
}

const Landing: React.FC<Props> = ({ onRecordClick, onHistoryClick }) => {
    return (
        <div className="landing-container pt-20"> {/* pt-20 to account for Header */}

            {/* --- Left / Red Section: RECORD --- */}
            <div
                className="landing-section left group cursor-pointer animate-slide-in-left"
                onClick={onRecordClick}
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='6' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23fff' fill-opacity='0.15'/%3E%3C/svg%3E\")", backgroundSize: '6px 6px' }}></div>

                {/* Huge Watermark Icon (Fixed position decorative) */}
                <MicrophoneIcon className="absolute w-[20rem] h-[20rem] md:w-[40rem] md:h-[40rem] -left-10 top-[25%] -translate-y-1/2 md:bottom-[-5rem] md:top-auto md:translate-y-0 text-white opacity-10 transform -rotate-12 pointer-events-none" />

                {/* Content - Absolute Centered in its visual area */}
                <div className="landing-content flex flex-col justify-center h-full">
                    <h2 className="text-5xl sm:text-7xl md:text-[8vw] font-black italic tracking-tighter text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,0.3)] leading-none transition-all duration-300 group-hover:scale-105 group-hover:translate-x-4">
                        NEW<br />RECORD
                    </h2>
                    <p className="mt-4 text-lg sm:text-xl md:text-2xl font-bold text-white/90 tracking-[0.5em] uppercase border-l-4 border-white pl-4 ml-2">
                        Start Here
                    </p>
                </div>
            </div>

            {/* --- Right / Blue Section: HISTORY --- */}
            <div
                className="landing-section right group cursor-pointer animate-slide-in-right"
                onClick={onHistoryClick}
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='10' height='10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h5v5H0zM5 5h5v5H5z' fill='%23fff' fill-opacity='0.12'/%3E%3C/svg%3E\")", backgroundSize: '10px 10px' }}></div>

                {/* Huge Watermark Icon */}
                <ClockIcon className="absolute w-[20rem] h-[20rem] md:w-[40rem] md:h-[40rem] -right-10 top-[75%] -translate-y-1/2 md:top-[-5rem] md:translate-y-0 text-white opacity-10 transform rotate-12 pointer-events-none" />

                {/* Content */}
                <div className="landing-content flex flex-col justify-center items-end h-full">
                    <h2 className="text-5xl sm:text-6xl md:text-[7vw] font-black italic tracking-tighter text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,0.3)] leading-none text-right transition-all duration-300 group-hover:scale-105 group-hover:-translate-x-4">
                        HISTORY
                    </h2>
                    <p className="mt-4 text-base sm:text-lg md:text-xl font-bold text-white/90 tracking-[0.3em] uppercase border-r-4 border-white pr-4 mr-2 text-right">
                        View Logs
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Landing;
