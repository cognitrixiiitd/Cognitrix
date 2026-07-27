// src/contexts/CurrentLectureContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";

const CurrentLectureContext = createContext({
  lecture: null,
  setLecture: () => {},
});

export const CurrentLectureProvider = ({ children }) => {
  const [lecture, setLecture] = useState(null);
  const value = useMemo(() => ({ lecture, setLecture }), [lecture]);

  return (
    <CurrentLectureContext.Provider value={value}>
      {children}
    </CurrentLectureContext.Provider>
  );
};

export const useCurrentLecture = () => useContext(CurrentLectureContext).lecture;
export const useSetCurrentLecture = () =>
  useContext(CurrentLectureContext).setLecture;
