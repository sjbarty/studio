import { useEffect } from 'react';

const Page = () => {
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.addEventListener('event', () => { /* Handler */ });

            // Cleanup
            return () => {
                document.removeEventListener('event', () => { /* Handler */ });
            };
        }
    }, []);

    return <div>Page Content</div>;
};

export default Page;