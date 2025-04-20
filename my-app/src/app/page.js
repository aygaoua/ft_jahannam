'use client'
import Image from "next/image";
import styles from "./page.module.css";
import Header from "@/../components/Header";
import Link from "next/link"
import { useEffect, useRef, useState } from "react";


function Home() {
  const inputRef = useRef(null);

  const handleClick = () => {
    if (inputRef.current){
      inputRef.current.focus()
    }
    console.log(inputRef.current.value); 
  };


  return (
    <main>
      <input ref={inputRef} />
      <div>  <button onClick={handleClick}> Click to Focus</button> </div>
      <Link href="/about"> GO TO ABOUT </Link>
    </main>
  );
}

export default Home;