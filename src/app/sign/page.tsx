import { useEffect } from 'react';

const MyComponent = () => {
    useEffect(() => {
        // Check to prevent Runtime TypeError
        if (typeof document !== 'undefined') {
            // Your effect code here
        }
    }, []);

    return <div>Hello World</div>;
};

export default MyComponent;