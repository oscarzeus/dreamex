// ...existing code...

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Create a reference to add a document to the "ptws" collection
    const ptwsRef = collection(db, "ptws");
    
    // Add validation to ensure required fields are present
    if (!formData.taskDescription || !formData.location) {
      toast.error("Please fill in all required fields");
      setLoading(false);
      return;
    }

    // Add the current user ID and timestamp to the form data
    const ptwData = {
      ...formData,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || auth.currentUser.email,
      createdAt: serverTimestamp(),
      status: "pending"
    };

    // Add the document to Firestore
    const docRef = await addDoc(ptwsRef, ptwData);
    
    // Update the document ID in the database for easier reference
    await updateDoc(doc(db, "ptws", docRef.id), {
      ptwId: docRef.id
    });

    toast.success("PTW submitted successfully!");
    setFormData(initialFormState);
    navigate("/dashboard");
  } catch (error) {
    console.error("Error submitting PTW:", error);
    toast.error("Error submitting PTW: " + error.message);
  } finally {
    setLoading(false);
  }
};

// ...existing code...
