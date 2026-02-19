import React from 'react';

interface PlaceholderPageProps {
    title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-transparent p-8">
            <h1 className="text-3xl font-bold text-white mb-4 drop-shadow-md">{title}</h1>
            <p className="text-slate-400">この機能は現在開発中です。</p>
        </div>
    );
};

export default PlaceholderPage;