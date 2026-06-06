import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const schema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password min 8 characters'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  phoneNumber: z.string().regex(/^\d{10}$/, '10 digits'),
  addressLine1: z.string().min(5, 'Street address required'),
  city: z.string().min(2, 'City required'),
  state: z.string().length(2, '2-letter state code'),
  zipCode: z.string().regex(/^\d{5}$/, '5-digit ZIP'),
  annualIncome: z.number().min(0, 'Annual income required'),
  agreeTerms: z.boolean().refine(v => v === true, 'You must agree to terms'),
});

export default function Register() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      dateOfBirth: '',
      phoneNumber: '',
      addressLine1: '',
      city: '',
      state: 'NY',
      zipCode: '',
      annualIncome: 0,
      agreeTerms: false,
    },
  });

  const onSubmit = async (data) => {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      await authRegister(
        data.email,
        data.password,
        data.fullName,
        950000000,
        { ...data, initialDepositDate: sixMonthsAgo.toISOString() }
      );
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-[#004977] mb-6">Open an Account</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><label>Full name</label><input {...register('fullName')} className="w-full border p-2 rounded" />{errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}</div>
            <div><label>Email</label><input {...register('email')} className="w-full border p-2 rounded" />{errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}</div>
            <div><label>Password</label><input type="password" {...register('password')} className="w-full border p-2 rounded" />{errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}</div>
            <div><label>Date of birth (YYYY-MM-DD)</label><input {...register('dateOfBirth')} className="w-full border p-2 rounded" />{errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth.message}</p>}</div>
            <div><label>Phone (10 digits)</label><input {...register('phoneNumber')} className="w-full border p-2 rounded" />{errors.phoneNumber && <p className="text-red-500 text-sm">{errors.phoneNumber.message}</p>}</div>
            <div><label>Street address</label><input {...register('addressLine1')} className="w-full border p-2 rounded" />{errors.addressLine1 && <p className="text-red-500 text-sm">{errors.addressLine1.message}</p>}</div>
            <div><label>City</label><input {...register('city')} className="w-full border p-2 rounded" />{errors.city && <p className="text-red-500 text-sm">{errors.city.message}</p>}</div>
            <div><label>State (2 letters)</label><input {...register('state')} className="w-full border p-2 rounded" />{errors.state && <p className="text-red-500 text-sm">{errors.state.message}</p>}</div>
            <div><label>ZIP code</label><input {...register('zipCode')} className="w-full border p-2 rounded" />{errors.zipCode && <p className="text-red-500 text-sm">{errors.zipCode.message}</p>}</div>
            <div><label>Annual income ($)</label><input type="number" {...register('annualIncome', { valueAsNumber: true })} className="w-full border p-2 rounded" />{errors.annualIncome && <p className="text-red-500 text-sm">{errors.annualIncome.message}</p>}</div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" {...register('agreeTerms')} /> <label>I agree to the terms</label>
          </div>
          {errors.agreeTerms && <p className="text-red-500 text-sm">{errors.agreeTerms.message}</p>}
          {error && <p className="text-red-500">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full bg-[#d22630] text-white py-2 rounded-lg hover:bg-red-700">
            {isSubmitting ? 'Opening...' : 'Open Account'}
          </button>
        </form>
        <p className="text-center mt-4">Already have an account? <Link to="/login" className="text-blue-600">Sign in</Link></p>
      </div>
    </div>
  );
}