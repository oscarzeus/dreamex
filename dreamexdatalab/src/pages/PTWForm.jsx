// ...existing code...

// Make sure the form has a proper onSubmit handler
return (
  <form onSubmit={handleSubmit} className="ptw-form">
    {/* ...existing code... */}
    
    <button 
      type="submit" 
      className="submit-button" 
      disabled={loading}
    >
      {loading ? "Submitting..." : "Submit PTW"}
    </button>
    
    {/* ...existing code... */}
  </form>
);

// ...existing code...
