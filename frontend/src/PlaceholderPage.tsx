import React from 'react';

interface PlaceholderPageProps {
    title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-slate-50 p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">{title}</h1>
            <p className="text-slate-500">この機能は現在開発中です。</p>
        </div>
    );
};

export default PlaceholderPage;
