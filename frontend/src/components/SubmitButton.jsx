import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const SubmitButton = ({ children, onClick, disabled, isLoading, className = "", loadingText = "Processing...", ...props }) => {
    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const timeoutRef = useRef(null);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleClick = async (e) => {
        if (isCoolingDown || disabled || isLoading) {
            e.preventDefault();
            return;
        }

        // Defer cooling down state to the event loop so that
        // form "submit" events have a chance to fire before the
        // button becomes disabled.
        setTimeout(() => {
            setIsCoolingDown(true);
        }, 0);

        timeoutRef.current = setTimeout(() => {
            setIsCoolingDown(false);
        }, 3000);

        if (onClick) {
            try {
                await onClick(e);
            } catch {
                // Error swallowed here so cooldown isn't aborted.
                // The actual form/API logic handles its own errors natively.
            }
        }
    };

    const isLocked = disabled || isLoading || isCoolingDown;

    return (
        <button
            onClick={handleClick}
            disabled={isLocked}
            className={`${className} ${isLocked ? 'opacity-50 cursor-not-allowed active:scale-100' : 'active:scale-95'}`}
            {...props}
        >
            {isLoading || isCoolingDown ? (
                <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    {loadingText}
                </span>
            ) : (
                children
            )}
        </button>
    );
};

export default SubmitButton;
