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
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>

                {/* Huge Watermark Icon (Fixed position decorative) */}
                <MicrophoneIcon className="absolute -left-20 -bottom-20 w-[40rem] h-[40rem] text-white opacity-10 transform -rotate-12 pointer-events-none" />

                {/* Content - Absolute Centered in its visual area */}
                <div className="landing-content flex flex-col justify-center h-full">
                    <h2 className="text-7xl md:text-[8vw] font-black italic tracking-tighter text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,0.3)] leading-none transition-all duration-300 group-hover:scale-105 group-hover:translate-x-4">
                        NEW<br />RECORD
                    </h2>
                    <p className="mt-4 text-xl md:text-2xl font-bold text-white/90 tracking-[0.5em] uppercase border-l-4 border-white pl-4 ml-2">
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
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay"></div>

                {/* Huge Watermark Icon */}
                <ClockIcon className="absolute -right-20 -top-20 w-[40rem] h-[40rem] text-white opacity-10 transform rotate-12 pointer-events-none" />

                {/* Content */}
                <div className="landing-content flex flex-col justify-center items-end h-full">
                    <h2 className="text-6xl md:text-[7vw] font-black italic tracking-tighter text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,0.3)] leading-none text-right transition-all duration-300 group-hover:scale-105 group-hover:-translate-x-4">
                        HISTORY
                    </h2>
                    <p className="mt-4 text-lg md:text-xl font-bold text-white/90 tracking-[0.3em] uppercase border-r-4 border-white pr-4 mr-2 text-right">
                        View Logs
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Landing;
