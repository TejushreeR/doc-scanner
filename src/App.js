import React, { useState, useEffect } from "react";
import Signup from "./Signup";
import Login from "./Login";
import Upload from "./components/Upload";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (!user) {
    return (
      <div>
        <h1>📄 Doc Scanner App</h1>
        <Signup />
        <Login />
      </div>
    );
  }

  return (
    <div>
      <h1>📄 Doc Scanner App</h1>
      <p>Welcome, {user.email}!</p>
      <Upload userId={user.uid} />
    </div>
  );
}

export default App;
