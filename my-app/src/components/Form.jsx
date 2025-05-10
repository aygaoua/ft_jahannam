// import { useState } from "react";
// import api from "../api";
// import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
// import { useNavigate } from "react-router-dom";
// import "../styles/Form.scss";


// function Form({ route, method }) {
//     const [username, setUsername] = useState("");
//     const [password, setPassword] = useState("");
//     const [loading, setLoading] = useState(false);
//     const navigate = useNavigate();
//     const name = method === "login" ? "Login" : "Register"

//     const handleSubmit = async (e) => {
//         setLoading(true);
//         e.preventDefault();

//         try {
//             const res = await api.post(route, { username, password })
//             if (method === "login") {
//                 localStorage.setItem(ACCESS_TOKEN, res.data.access);
//                 localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
//                 localStorage.setItem("username", username);
//                 navigate("/tictactoe")
//             }
//             else {
//                 navigate("/login")
//             }

//         }
//         catch (error) {
//             console.log("waaaaa nayda ....!")
//             alert(error);
//         } finally {
//             setLoading(false);
//         }
//     }

//     return <form onSubmit={handleSubmit} className="form-container">
//         <h1>{name}</h1>
//         <input
//             className="form-input"
//             type="text"
//             value={username}
//             onChange={(e) => setUsername(e.target.value)}
//             placeholder="Username"
//         />
//         <input
//             className="form-input"
//             type="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             placeholder="Password"
//         />
//         <button className="form-button" type="submit">
//             {name}
//         </button>
//     </form>
// }

// export default Form

import { useState } from "react";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useNavigate } from "react-router-dom";
import "../styles/Form.scss";

function Form({ route, method }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const name = method === "login" ? "LOGIN" : "REGISTER";

    const handleSubmit = async (e) => {
        setLoading(true);
        setError("");
        e.preventDefault();
        
        if (!username || !password) {
            setError("PLEASE COMPLETE ALL FIELDS!");
            const audio = new Audio('/sounds/error1.wav');
            audio.play().catch(() => {});
            setLoading(false);
            return;
        }

        try {
            const res = await api.post(route, { username, password });
            if (method === "login") {
                sessionStorage.setItem(ACCESS_TOKEN, res.data.access);
                sessionStorage.setItem(REFRESH_TOKEN, res.data.refresh);
                sessionStorage.setItem("username", username);
                navigate("/");
            } else {
                navigate("/login");
            }
        } catch (error) {
            console.error("Authentication error:", error);
            setError("ACCESS DENIED! INVALID CREDENTIALS");
            const audio = new Audio('/sounds/error1.wav');
            audio.play().catch(e => console.log("Audio error:", e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="retro-screen">
            <div className="scanlines"></div>
            <div className="retro-container">
                <form onSubmit={handleSubmit} className="retro-form">
                    <h1 className="retro-title">{name}</h1>
                    
                    {error && <div className="retro-error">{error}</div>}
                    
                    <div className="retro-input-group">
                        <label className="retro-label">USERNAME:</label>
                        <input
                            className="retro-input"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="ENTER USERNAME"
                        />
                    </div>
                    
                    <div className="retro-input-group">
                        <label className="retro-label">PASSWORD:</label>
                        <input
                            className="retro-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="ENTER PASSWORD"
                        />
                    </div>
                    
                    <button 
                        className="retro-button" 
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "PROCESSING..." : name}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Form;