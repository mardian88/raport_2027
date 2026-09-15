DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@rqm.com' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Update existing user
    UPDATE auth.users SET 
      encrypted_password = crypt('mardian2828', gen_salt('bf')),
      confirmation_token = '',
      email_change = '',
      email_change_token_new = '',
      recovery_token = ''
    WHERE id = v_user_id;
  ELSE
    -- Insert new user
    v_user_id := uuid_generate_v4();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      aud,
      role,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@rqm.com',
      crypt('mardian2828', gen_salt('bf')),
      now(),
      '{"full_name": "Admin RQM"}'::jsonb,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Ensure auth.identities exists so Supabase GoTrue can login
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email') THEN
    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      uuid_generate_v4(),
      v_user_id::text,
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id::text, 'admin@rqm.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  END IF;

  -- Ensure public.users table exists and update the role to 'admin'
  UPDATE public.users 
  SET role = 'admin', full_name = 'Admin RQM'
  WHERE email = 'admin@rqm.com' OR id = v_user_id;

END $$;
