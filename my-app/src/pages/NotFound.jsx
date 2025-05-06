import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotFound.scss';

function NotFound() {
    return (
        <div className="not-found-container">
            <div className="glitch-text" data-text="404">404</div>
            <h1 className="error-title">GAME OVER</h1>
            <p className="error-message">THE PAGE YOU ARE LOOKING FOR DOES NOT EXIST</p>
            <div className="continue-prompt">
                <span className="blink">CONTINUE?</span>
                <div className="countdown">10</div>
            </div>
            <Link to="/" className="restart-button">RETURN TO MAIN MENU</Link>
        </div>
    );
}

export default NotFound;